import fs from "fs";
import path from "path";

type Label = 0 | 1;

interface DatasetRow {
  review: string;
  label: Label;
}

interface ModelState {
  totalRows: number;
  totalGenuine: number;
  totalFake: number;
  fakeTokenCounts: Map<string, number>;
  genuineTokenCounts: Map<string, number>;
  fakeTokenTotal: number;
  genuineTokenTotal: number;
  vocabulary: Set<string>;
}

export interface FakeReviewPrediction {
  isFake: boolean;
  confidenceScore: number;
  modelSource: string;
  datasetSize: number;
}

const DEFAULT_DATASET_PATH = path.resolve(process.cwd(), "review-dataset.csv");
const DATASET_PATH = process.env.REVIEW_DATASET_PATH?.trim() || DEFAULT_DATASET_PATH;

const tokenize = (text: string) => {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized
    .split(" ")
    .filter((token) => token.length >= 2);
};

const parseCsvLine = (line: string): DatasetRow | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.toLowerCase() === "review,label") {
    return null;
  }

  // Expected format: "review text",0
  const match = trimmed.match(/^"(.*)",([01])$/);
  if (!match) {
    return null;
  }

  const review = match[1].replace(/""/g, "\"").trim();
  const label = Number(match[2]) as Label;
  return { review, label };
};

const readDataset = () => {
  try {
    const raw = fs.readFileSync(DATASET_PATH, "utf-8");
    return raw
      .split(/\r?\n/)
      .map((line) => parseCsvLine(line))
      .filter((row): row is DatasetRow => Boolean(row));
  } catch {
    return [] as DatasetRow[];
  }
};

const trainModel = (rows: DatasetRow[]): ModelState => {
  const state: ModelState = {
    totalRows: rows.length,
    totalGenuine: 0,
    totalFake: 0,
    fakeTokenCounts: new Map<string, number>(),
    genuineTokenCounts: new Map<string, number>(),
    fakeTokenTotal: 0,
    genuineTokenTotal: 0,
    vocabulary: new Set<string>()
  };

  rows.forEach((row) => {
    const tokens = tokenize(row.review);
    if (!tokens.length) {
      return;
    }

    if (row.label === 1) {
      state.totalFake += 1;
      tokens.forEach((token) => {
        state.vocabulary.add(token);
        state.fakeTokenCounts.set(token, (state.fakeTokenCounts.get(token) || 0) + 1);
        state.fakeTokenTotal += 1;
      });
      return;
    }

    state.totalGenuine += 1;
    tokens.forEach((token) => {
      state.vocabulary.add(token);
      state.genuineTokenCounts.set(token, (state.genuineTokenCounts.get(token) || 0) + 1);
      state.genuineTokenTotal += 1;
    });
  });

  return state;
};

const fallbackRows: DatasetRow[] = [
  { review: "The WiFi speed is stable and suitable for video meetings.", label: 0 },
  { review: "Comfortable seating and good lighting for long work hours.", label: 0 },
  { review: "The workspace is clean and professionally maintained.", label: 0 },
  { review: "BEST COWORKING SPACE EVER MUST JOIN NOW!!!", label: 1 },
  { review: "Amazing amazing amazing workspace best best!!!", label: 1 },
  { review: "Perfect office 100% recommended must visit!!!", label: 1 }
];

const datasetRows = readDataset();
const trainedModel = trainModel(datasetRows.length ? datasetRows : fallbackRows);
const modelSource = datasetRows.length ? DATASET_PATH : "fallback-inline-dataset";

const logProbToken = (
  token: string,
  tokenCounts: Map<string, number>,
  tokenTotal: number,
  vocabSize: number
) => {
  const count = tokenCounts.get(token) || 0;
  const smoothed = (count + 1) / (tokenTotal + vocabSize);
  return Math.log(smoothed);
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const detectFakeReview = (text: string): FakeReviewPrediction => {
  const normalized = String(text || "").trim();
  const tokens = tokenize(normalized);
  const vocabSize = Math.max(trainedModel.vocabulary.size, 1);
  const totalSamples = Math.max(trainedModel.totalRows, 1);

  const priorFake = (trainedModel.totalFake + 1) / (totalSamples + 2);
  const priorGenuine = (trainedModel.totalGenuine + 1) / (totalSamples + 2);

  let fakeLog = Math.log(priorFake);
  let genuineLog = Math.log(priorGenuine);

  tokens.forEach((token) => {
    fakeLog += logProbToken(token, trainedModel.fakeTokenCounts, trainedModel.fakeTokenTotal, vocabSize);
    genuineLog += logProbToken(
      token,
      trainedModel.genuineTokenCounts,
      trainedModel.genuineTokenTotal,
      vocabSize
    );
  });

  // Lightweight style heuristics to catch promotional burst patterns.
  const exclamationCount = (normalized.match(/!/g) || []).length;
  const hasWordRepeat = /\b(\w+)\b(?:\s+\1){1,}/i.test(normalized);
  const upperRatio = (() => {
    const letters = (normalized.match(/[A-Za-z]/g) || []).length;
    if (!letters) return 0;
    const uppercase = (normalized.match(/[A-Z]/g) || []).length;
    return uppercase / letters;
  })();

  if (exclamationCount >= 3) {
    fakeLog += 0.7;
  }
  if (hasWordRepeat) {
    fakeLog += 0.55;
  }
  if (upperRatio > 0.35) {
    fakeLog += 0.45;
  }

  const delta = clamp(fakeLog - genuineLog, -12, 12);
  const confidence = 1 / (1 + Math.exp(-delta));
  const confidenceScore = Number(confidence.toFixed(4));

  return {
    isFake: confidenceScore >= 0.6,
    confidenceScore,
    modelSource,
    datasetSize: trainedModel.totalRows
  };
};

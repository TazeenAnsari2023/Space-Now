import fs from "fs";
import path from "path";

export type IndiaCityGeo = {
  name: string;
  latitude: number;
  longitude: number;
};

export type IndiaRegionGeo = {
  name: string;
  kind: "state" | "union_territory";
  cities: IndiaCityGeo[];
};

let cachedRegions: IndiaRegionGeo[] | null = null;

const INDIA_CSV_RELATIVE_PATH = path.join("data", "Indian Cities Geo Data.csv");

const UNION_TERRITORIES = new Set([
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
]);

const parseCsvLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

const cleanCityName = (value: string) =>
  value.replace(/\s+Latitude and Longitude$/i, "").trim();

export const loadIndiaRegionsFromCsv = (): IndiaRegionGeo[] => {
  if (cachedRegions) {
    return cachedRegions;
  }

  const pathCandidates = [
    path.resolve(process.cwd(), INDIA_CSV_RELATIVE_PATH),
    path.resolve(process.cwd(), "server", INDIA_CSV_RELATIVE_PATH),
    path.resolve(__dirname, "..", "..", INDIA_CSV_RELATIVE_PATH),
    path.resolve(__dirname, "..", "..", "..", INDIA_CSV_RELATIVE_PATH)
  ];

  const csvPath = pathCandidates.find((candidate) => fs.existsSync(candidate));
  if (!csvPath) {
    throw new Error(`India CSV not found in expected locations: ${pathCandidates.join(" | ")}`);
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    cachedRegions = [];
    return cachedRegions;
  }

  const regionsMap = new Map<string, IndiaRegionGeo>();

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 4) {
      continue;
    }

    const state = cells[0].trim();
    const cityName = cleanCityName(cells[1].trim());
    const latitude = Number(cells[2]);
    const longitude = Number(cells[3]);

    if (!state || !cityName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      continue;
    }

    const existing = regionsMap.get(state);
    if (!existing) {
      regionsMap.set(state, {
        name: state,
        kind: UNION_TERRITORIES.has(state) ? "union_territory" : "state",
        cities: [{ name: cityName, latitude, longitude }]
      });
      continue;
    }

    if (!existing.cities.some((city) => city.name.toLowerCase() === cityName.toLowerCase())) {
      existing.cities.push({ name: cityName, latitude, longitude });
    }
  }

  cachedRegions = Array.from(regionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  for (const region of cachedRegions) {
    region.cities.sort((a, b) => a.name.localeCompare(b.name));
  }

  return cachedRegions;
};

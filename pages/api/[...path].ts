import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import dotenv from "dotenv";

let isReady = false;
let appHandler: ((req: NextApiRequest, res: NextApiResponse) => unknown) | null = null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!isReady) {
      dotenv.config({ path: path.resolve(process.cwd(), "server", ".env") });

      const [{ default: connectDB }, { default: app }] = await Promise.all([
        import("../../server/src/config/db"),
        import("../../server/src/app")
      ]);

      await connectDB();
      appHandler = app as unknown as (req: NextApiRequest, res: NextApiResponse) => unknown;
      isReady = true;
    }

    if (!appHandler) {
      throw new Error("API handler failed to initialize");
    }

    return appHandler(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "API bootstrap failed";
    console.error("[NEXT API HANDLER ERROR]", error);
    if (!res.headersSent) {
      return res.status(500).json({ message });
    }
    return res.end();
  }
}

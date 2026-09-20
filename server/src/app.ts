import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import authRoutes from "./routes/auth.routes";
import reviewRoutes from "./routes/review.routes";
import notificationRoutes from "./routes/notification.routes";
import spaceRoutes from "./routes/space.routes";
import adminRoutes from "./routes/admin.routes";
import bookingRoutes from "./routes/booking.routes";

const app: Application = express();

const corsOrigin = process.env.CORS_ORIGIN?.trim();
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(",").map((origin) => origin.trim()) : true
  })
);
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "space-now-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/spaces", spaceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bookings", bookingRoutes);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  console.error("[API ERROR]", err);
  res.status(500).json({ message });
});

export default app;


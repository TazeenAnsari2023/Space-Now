import { Router } from "express";
import { requireRole, verifyToken } from "../middleware/auth.middleware";
import {
  cancelBooking,
  createBooking,
  getMyBookings,
  getOwnerAnalytics,
  getOwnerBookings,
  verifyBookingPayment
} from "../controllers/booking.controller";

const router = Router();

router.get("/me", verifyToken, getMyBookings);
router.get("/owner/me", verifyToken, requireRole("owner", "admin"), getOwnerBookings);
router.get("/owner/analytics", verifyToken, requireRole("owner", "admin"), getOwnerAnalytics);
router.post("/spaces/:spaceId", verifyToken, requireRole("user", "owner", "admin"), createBooking);
router.post("/verify-payment", verifyToken, requireRole("user", "owner", "admin"), verifyBookingPayment);
router.patch("/:id/cancel", verifyToken, cancelBooking);

export default router;

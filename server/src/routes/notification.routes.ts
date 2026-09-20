import { Router } from "express";
import { requireRole, verifyToken } from "../middleware/auth.middleware";
import {
  createSpaceLead,
  getMyNotifications,
  markNotificationRead,
  respondToLeadNotification
} from "../controllers/notification.controller";

const router = Router();

router.get("/me", verifyToken, getMyNotifications);
router.patch("/:id/read", verifyToken, markNotificationRead);
router.patch("/:id/respond", verifyToken, requireRole("owner", "admin"), respondToLeadNotification);
router.post("/spaces/:id/lead", verifyToken, requireRole("user", "owner"), createSpaceLead);

export default router;

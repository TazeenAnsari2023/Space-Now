import { Router } from "express";
import { requireRole, verifyToken } from "../middleware/auth.middleware";
import {
  deleteReviewAsAdmin,
  deleteSpaceAsAdmin,
  getAdminStats,
  getModerationReviews,
  getModerationSpaces,
  getOwnerVerificationQueue,
  moderateOwnerVerification,
  moderateSpaceVerification
} from "../controllers/admin.controller";

const router = Router();

router.use(verifyToken, requireRole("admin"));

router.get("/stats", getAdminStats);
router.get("/spaces", getModerationSpaces);
router.patch("/spaces/:id/verify", moderateSpaceVerification);
router.delete("/spaces/:id", deleteSpaceAsAdmin);
router.get("/reviews", getModerationReviews);
router.delete("/reviews/:id", deleteReviewAsAdmin);
router.get("/owners", getOwnerVerificationQueue);
router.patch("/owners/:id/verify", moderateOwnerVerification);

export default router;

import { Router } from "express";
import { createReview, getReviewsBySpace } from "../controllers/review.controller";
import { attachUserIfPresent, verifyToken } from "../middleware/auth.middleware";

const router = Router();

router.get("/:spaceId", attachUserIfPresent, getReviewsBySpace);
router.post("/", verifyToken, createReview);

export default router;

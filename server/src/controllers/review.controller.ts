import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import Review from "../models/Review";
import Space from "../models/Space";
import { detectFakeReview } from "../services/fakeReview.service";

export const createReview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { spaceId, rating, comment } = req.body;

    if (!spaceId || !rating || !comment?.trim()) {
      return res.status(400).json({ message: "spaceId, rating, and comment are required" });
    }

    if (Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "rating must be between 1 and 5" });
    }

    const space = await Space.findById(spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.verificationStatus && space.verificationStatus !== "verified") {
      return res.status(400).json({ message: "Reviews are allowed only for verified spaces" });
    }

    const prediction = detectFakeReview(comment);
    const cleanedComment = comment.trim();
    const numericRating = Number(rating);

    const review = await Review.findOneAndUpdate(
      { userId: req.user.id, spaceId },
      {
        $set: {
          rating: numericRating,
          comment: cleanedComment,
          isFake: prediction.isFake,
          confidenceScore: prediction.confidenceScore
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    const genuineStats = await Review.aggregate([
      {
        $match: {
          spaceId: space._id,
          isFake: false
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 }
        }
      }
    ]);

    const nextRating = genuineStats[0]?.avgRating ? Number(genuineStats[0].avgRating.toFixed(2)) : 0;
    const nextReviewCount = genuineStats[0]?.total || 0;

    await Space.findByIdAndUpdate(space._id, {
      rating: nextRating,
      reviewCount: nextReviewCount
    });

    const populated = await review.populate({ path: "userId", select: "name username" });

    return res.status(201).json({
      ...populated.toObject(),
      model: {
        datasetSize: prediction.datasetSize,
        source: prediction.modelSource
      }
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getReviewsBySpace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const includeFake = req.query.includeFake === "true" && req.user?.role === "admin";
    const filter = includeFake
      ? { spaceId: req.params.spaceId }
      : { spaceId: req.params.spaceId, isFake: false };

    const reviews = await Review.find(filter)
      .populate({ path: "userId", select: "name username" })
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import Notification from "../models/Notification";
import Review from "../models/Review";
import Space from "../models/Space";
import User from "../models/User";

const verifyAdmin = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }
  return true;
};

export const getAdminStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const [
      totalUsers,
      totalOwners,
      verifiedOwners,
      pendingOwners,
      totalSpaces,
      verifiedSpaces,
      pendingSpaces,
      rejectedSpaces,
      totalReviews,
      fakeReviews
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "owner" }),
      User.countDocuments({ role: "owner", ownerVerificationStatus: "verified" }),
      User.countDocuments({ role: "owner", ownerVerificationStatus: { $in: ["pending", null] } }),
      Space.countDocuments({}),
      Space.countDocuments({ verificationStatus: { $in: ["verified", null] } }),
      Space.countDocuments({ verificationStatus: "pending" }),
      Space.countDocuments({ verificationStatus: "rejected" }),
      Review.countDocuments({}),
      Review.countDocuments({ isFake: true })
    ]);

    return res.json({
      totalUsers,
      totalOwners,
      verifiedOwners,
      pendingOwners,
      totalSpaces,
      verifiedSpaces,
      pendingSpaces,
      rejectedSpaces,
      totalReviews,
      fakeReviews
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getModerationSpaces = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const status = String(req.query.status || "all");
    const filter =
      status === "all"
        ? {}
        : status === "verified"
          ? { $or: [{ verificationStatus: "verified" }, { verificationStatus: { $exists: false } }] }
          : { verificationStatus: status };

    const spaces = await Space.find(filter).sort({ createdAt: -1 });
    return res.json(spaces);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const moderateSpaceVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const decision = String(req.body.decision || "").toLowerCase();
    const notes = String(req.body.notes || "").trim() || undefined;

    if (!["verified", "rejected", "pending"].includes(decision)) {
      return res.status(400).json({ message: "decision must be verified, rejected, or pending" });
    }

    const space = await Space.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: decision,
        verificationNotes: notes,
        verifiedAt: decision === "verified" ? new Date() : undefined
      },
      { new: true }
    );

    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.ownerId) {
      await Notification.create({
        recipientUserId: space.ownerId,
        type: "system",
        title: `Space ${decision}`,
        message: `Your listing "${space.name}" is now ${decision}.${notes ? ` Note: ${notes}` : ""}`,
        spaceId: space._id
      });
    }

    return res.json(space);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteSpaceAsAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const deleted = await Space.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Space not found" });
    }

    await Review.deleteMany({ spaceId: deleted._id });
    return res.json({ message: "Space removed by admin" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getModerationReviews = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const fakeOnly = String(req.query.fakeOnly || "false") === "true";
    const reviews = await Review.find(fakeOnly ? { isFake: true } : {})
      .populate({ path: "userId", select: "name username" })
      .populate({ path: "spaceId", select: "name city state" })
      .sort({ createdAt: -1 });

    return res.json(reviews);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteReviewAsAdmin = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const deleted = await Review.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Review not found" });
    }

    return res.json({ message: "Review removed by admin" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOwnerVerificationQueue = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const status = String(req.query.status || "pending");
    const filter =
      status === "all"
        ? { role: "owner" }
        : status === "pending"
          ? { role: "owner", $or: [{ ownerVerificationStatus: "pending" }, { ownerVerificationStatus: { $exists: false } }] }
          : { role: "owner", ownerVerificationStatus: status };

    const owners = await User.find(filter).select("-password").sort({ createdAt: -1 });
    return res.json(owners);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const moderateOwnerVerification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!verifyAdmin(req, res)) {
      return;
    }

    const decision = String(req.body.decision || "").toLowerCase();
    if (!["verified", "rejected", "pending"].includes(decision)) {
      return res.status(400).json({ message: "decision must be verified, rejected, or pending" });
    }

    const owner = await User.findOneAndUpdate(
      { _id: req.params.id, role: "owner" },
      { ownerVerificationStatus: decision },
      { new: true }
    ).select("-password");

    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    await Notification.create({
      recipientUserId: owner._id,
      type: "system",
      title: "Owner verification update",
      message: `Your owner account status is now ${decision}.`
    });

    return res.json(owner);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import Notification from "../models/Notification";
import Space from "../models/Space";
import User from "../models/User";

const formatUserName = (name?: string, username?: string) => {
  const trimmedName = String(name || "").trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedUsername = String(username || "").trim();
  return trimmedUsername || "A user";
};

export const getMyNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notifications = await Notification.find({ recipientUserId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(
      notifications.map((item) => ({
        id: String(item._id),
        type: item.type,
        title: item.title,
        message: item.message,
        spaceId: item.spaceId ? String(item.spaceId) : undefined,
        createdAt: item.createdAt,
        read: Boolean(item.read),
        actionStatus: item.actionStatus,
        actionable: (item.type === "quote" || item.type === "tour") && item.actionStatus === "pending"
      }))
    );
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipientUserId: req.user.id
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read" });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const respondToLeadNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { decision } = req.body as { decision?: "approved" | "rejected" };
    if (!decision || !["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected" });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientUserId: req.user.id,
      type: { $in: ["quote", "tour"] }
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.actionStatus && notification.actionStatus !== "pending") {
      return res.status(400).json({ message: "This request was already handled" });
    }

    const owner = await User.findById(req.user.id).select("name username");
    const space = notification.spaceId ? await Space.findById(notification.spaceId) : null;

    notification.actionStatus = decision;
    notification.read = true;
    await notification.save();

    if (notification.actorUserId) {
      const ownerLabel = formatUserName(owner?.name, owner?.username);
      const actionLabel = notification.type === "quote" ? "quote request" : "tour booking";
      const decisionLabel = decision === "approved" ? "approved" : "rejected";

      await Notification.create({
        recipientUserId: notification.actorUserId,
        actorUserId: req.user.id,
        spaceId: notification.spaceId,
        type: "system",
        title:
          decision === "approved"
            ? `${notification.type === "quote" ? "Quote" : "Tour"} approved`
            : `${notification.type === "quote" ? "Quote" : "Tour"} rejected`,
        message: `${ownerLabel} ${decisionLabel} your ${actionLabel}${space ? ` for ${space.name}` : ""}.`,
        read: false
      });
    }

    return res.json({ message: `Request ${decision}` });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const createSpaceLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { action } = req.body as { action?: "quote" | "tour" };
    if (!action || !["quote", "tour"].includes(action)) {
      return res.status(400).json({ message: "Action must be quote or tour" });
    }

    const space = await Space.findById(req.params.id);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (!space.ownerId) {
      return res.status(400).json({ message: "This space has no owner assigned" });
    }

    const actor = await User.findById(req.user.id).select("name username role");
    if (!actor) {
      return res.status(404).json({ message: "User not found" });
    }

    const actorLabel = formatUserName(actor.name, actor.username);
    const actionLabel = action === "quote" ? "quote request" : "tour booking";
    const placeLabel = [space.city, space.state].filter(Boolean).join(", ") || "Unknown location";

    const ownerNotification = await Notification.create({
      recipientUserId: space.ownerId,
      actorUserId: req.user.id,
      spaceId: space._id,
      type: action,
      title: `${action === "quote" ? "New quote request" : "New tour booking"} for ${space.name}`,
      message: `${actorLabel} sent a ${actionLabel} for ${space.name} (${placeLabel}).`,
      actionStatus: "pending"
    });

    const userNotification = await Notification.create({
      recipientUserId: req.user.id,
      actorUserId: req.user.id,
      spaceId: space._id,
      type: action,
      title: action === "quote" ? `Quote requested for ${space.name}` : `Tour booked for ${space.name}`,
      message:
        action === "quote"
          ? `Your quote request for ${space.name} was sent to the owner. They can now follow up with pricing and availability.`
          : `Your tour booking request for ${space.name} was sent to the owner. They can now follow up with a visit schedule.`,
      read: false
    });

    return res.status(201).json({
      message: action === "quote" ? "Quote request sent" : "Tour booking sent",
      notifications: [ownerNotification, userNotification]
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

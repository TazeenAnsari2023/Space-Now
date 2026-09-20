import crypto from "crypto";
import Razorpay from "razorpay";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import Booking from "../models/Booking";
import Notification from "../models/Notification";
import Space from "../models/Space";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID?.trim() || "";
const razorpaySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";
const isRazorpayConfigured = Boolean(razorpayKeyId && razorpaySecret);
const paymentModeEnv = (process.env.PAYMENT_MODE || "").trim().toLowerCase();
const paymentMode = paymentModeEnv === "razorpay" ? "razorpay" : "mock";

const razorpay = isRazorpayConfigured
  ? new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpaySecret
    })
  : null;

type BookingPlan =
  | "coworking-space"
  | "private-office"
  | "virtual-office"
  | "serviced-office";

type SpacePricingLike = {
  pricePerMonth?: number;
  pricing?: {
    servicedOffice?: number;
    coworkingSpace?: number;
    privateOffice?: number;
    virtualOffice?: number;
  };
};

const getUnitPrice = (space: SpacePricingLike | null, plan: BookingPlan) => {
  const base = space?.pricePerMonth || 0;
  const pricing = space?.pricing || {};

  switch (plan) {
    case "private-office":
      return Number(pricing.privateOffice ?? base + 7000);
    case "virtual-office":
      return Number(pricing.virtualOffice ?? 2500);
    case "serviced-office":
      return Number(pricing.servicedOffice ?? base + 12000);
    case "coworking-space":
    default:
      return Number(pricing.coworkingSpace ?? base);
  }
};

export const createBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (paymentMode === "razorpay" && (!isRazorpayConfigured || !razorpay)) {
      return res.status(500).json({
        message:
          "Razorpay mode is enabled but keys are missing. Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET or switch PAYMENT_MODE=mock."
      });
    }

    const { date, seatsBooked, plan } = req.body as {
      date?: string;
      seatsBooked?: number;
      plan?: BookingPlan;
    };
    const parsedSeats = Number(seatsBooked);
    const parsedDate = date ? new Date(date) : null;
    const selectedPlan: BookingPlan = plan || "coworking-space";

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Valid booking date is required" });
    }

    if (!Number.isInteger(parsedSeats) || parsedSeats <= 0) {
      return res.status(400).json({ message: "seatsBooked must be a positive integer" });
    }

    const now = new Date();
    if (parsedDate.getTime() < now.getTime() - 60 * 1000) {
      return res.status(400).json({ message: "Booking date cannot be in the past" });
    }

    const space = await Space.findById(req.params.spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.verificationStatus && space.verificationStatus !== "verified") {
      return res.status(400).json({ message: "Booking allowed only for verified spaces" });
    }

    if (space.availableSeats < parsedSeats) {
      return res.status(400).json({ message: "Requested seats exceed currently available seats" });
    }

    const unitPrice = getUnitPrice(space, selectedPlan);
    const totalAmount = unitPrice * parsedSeats;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return res.status(400).json({ message: "Invalid booking amount" });
    }

    const booking = await Booking.create({
      userId: req.user.id,
      spaceId: space._id,
      plan: selectedPlan,
      date: parsedDate,
      seatsBooked: parsedSeats,
      unitPrice,
      totalAmount,
      status: "pending",
      paymentGateway: paymentMode,
      paymentStatus: "created"
    });

    if (paymentMode === "mock") {
      booking.paymentOrderId = `mock_order_${String(booking._id)}_${Date.now()}`;
      await booking.save();

      return res.status(201).json({
        booking,
        payment: {
          gateway: "mock",
          keyId: "mock_key_id",
          orderId: booking.paymentOrderId,
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          bookingId: String(booking._id)
        }
      });
    }

    try {
      const order = await razorpay!.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `booking_${String(booking._id)}`,
        notes: {
          bookingId: String(booking._id),
          spaceId: String(space._id),
          userId: req.user.id
        }
      });

      booking.paymentOrderId = order.id;
      await booking.save();

      return res.status(201).json({
        booking,
        payment: {
          gateway: "razorpay",
          keyId: razorpayKeyId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          bookingId: String(booking._id)
        }
      });
    } catch (orderError: any) {
      await Booking.findByIdAndDelete(booking._id);
      const orderMessage =
        orderError?.error?.description ||
        orderError?.message ||
        "Unable to create Razorpay order. Check test keys and Razorpay dashboard settings.";
      return res.status(502).json({ message: orderMessage });
    }
  } catch (error: any) {
    const message = error?.message || "Server error";
    return res.status(500).json({ message });
  }
};

export const verifyBookingPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (paymentMode === "razorpay" && (!isRazorpayConfigured || !razorpaySecret)) {
      return res.status(500).json({ message: "Payment gateway is not configured" });
    }

    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      bookingId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!bookingId) {
      return res.status(400).json({ message: "Missing payment verification payload" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (String(booking.userId) !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
      return res.json({ message: "Payment already verified", booking });
    }

    if (booking.paymentGateway === "razorpay") {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ message: "Missing payment verification payload" });
      }

      if (booking.paymentOrderId !== razorpay_order_id) {
        return res.status(400).json({ message: "Order id mismatch" });
      }

      const generated = crypto
        .createHmac("sha256", razorpaySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated !== razorpay_signature) {
        booking.paymentStatus = "failed";
        booking.status = "payment_failed";
        await booking.save();
        return res.status(400).json({ message: "Payment signature verification failed" });
      }
    }

    const space = await Space.findById(booking.spaceId);
    if (!space) {
      return res.status(404).json({ message: "Space not found" });
    }

    if (space.availableSeats < booking.seatsBooked) {
      booking.paymentStatus = "failed";
      booking.status = "payment_failed";
      await booking.save();
      return res.status(409).json({
        message:
          "Payment captured but seats are no longer available. Contact support for refund handling."
      });
    }

    space.availableSeats -= booking.seatsBooked;
    await space.save();

    booking.paymentId = razorpay_payment_id || `mock_payment_${Date.now()}`;
    booking.paymentSignature = razorpay_signature || "mock_signature";
    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    await booking.save();

    if (space.ownerId) {
      await Notification.create({
        recipientUserId: space.ownerId,
        actorUserId: req.user.id,
        spaceId: space._id,
        type: "system",
        title: `New paid booking for ${space.name}`,
        message: `A user completed payment and booked ${booking.seatsBooked} seat(s) for ${new Date(
          booking.date
        ).toLocaleDateString("en-IN")} (${booking.plan}).`
      });
    }

    await Notification.create({
      recipientUserId: req.user.id,
      actorUserId: req.user.id,
      spaceId: space._id,
      type: "system",
      title: `Payment successful for ${space.name}`,
      message: `Your payment for Rs ${booking.totalAmount} is successful. Booking is confirmed.`
    });

    return res.json({ message: "Payment verified and booking confirmed", booking });
  } catch (error: any) {
    const message = error?.message || "Server error";
    return res.status(500).json({ message });
  }
};

export const getMyBookings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await Booking.find({ userId: req.user.id })
      .populate({ path: "spaceId", select: "name city state pricePerMonth photos" })
      .sort({ createdAt: -1 });

    return res.json(bookings);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOwnerBookings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ownerSpaces = await Space.find({ ownerId: req.user.id }).select("_id name city state pricePerMonth");
    const ownerSpaceIds = ownerSpaces.map((space) => space._id);

    const bookings = await Booking.find({ spaceId: { $in: ownerSpaceIds } })
      .populate({ path: "userId", select: "name username email" })
      .populate({ path: "spaceId", select: "name city state pricePerMonth" })
      .sort({ createdAt: -1 });

    return res.json(bookings);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const cancelBooking = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const space = await Space.findById(booking.spaceId);
    const isOwnerOfSpace = space && String(space.ownerId || "") === req.user.id;
    const isBooker = String(booking.userId) === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isBooker && !isOwnerOfSpace && !isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    const wasConfirmed = booking.status === "confirmed";

    booking.status = "cancelled";
    await booking.save();

    if (space && wasConfirmed) {
      space.availableSeats += booking.seatsBooked;
      await space.save();
    }

    return res.json({ message: "Booking cancelled", booking });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOwnerAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const ownerSpaces = await Space.find({ ownerId: req.user.id }).select(
      "_id pricePerMonth availableSeats"
    );
    const spaceIds = ownerSpaces.map((space) => space._id);

    const [bookingStats] = await Booking.aggregate([
      { $match: { spaceId: { $in: spaceIds }, status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          seatsBooked: { $sum: "$seatsBooked" }
        }
      }
    ]);

    const upcomingCount = await Booking.countDocuments({
      spaceId: { $in: spaceIds },
      status: "confirmed",
      date: { $gte: new Date() }
    });

    const totalSpaces = ownerSpaces.length;
    const totalAvailableSeats = ownerSpaces.reduce((sum, space) => sum + space.availableSeats, 0);
    const avgPrice =
      totalSpaces > 0
        ? Math.round(ownerSpaces.reduce((sum, space) => sum + space.pricePerMonth, 0) / totalSpaces)
        : 0;
    const totalBookings = bookingStats?.totalBookings || 0;
    const totalSeatsBooked = bookingStats?.seatsBooked || 0;

    return res.json({
      totalSpaces,
      totalAvailableSeats,
      avgPrice,
      totalBookings,
      upcomingBookings: upcomingCount,
      totalSeatsBooked
    });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

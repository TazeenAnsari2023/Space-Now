import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/jwt";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import OtpCode from "../models/OtpCode";
import User from "../models/User";
import { sendOtpEmail, sendPasswordChangedEmail } from "../services/email.service";

const OTP_EXP_MINUTES = 10;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim().toLowerCase();

const createOtp = async (email: string, purpose: "signup" | "forgot_password") => {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

  await OtpCode.deleteMany({ email, purpose, consumed: false });
  await OtpCode.create({ email, purpose, code, expiresAt, consumed: false });

  return code;
};

const verifyOtp = async (email: string, purpose: "signup" | "forgot_password", otp: string) => {
  const record = await OtpCode.findOne({
    email,
    purpose,
    code: otp,
    consumed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!record) {
    return false;
  }

  record.consumed = true;
  await record.save();
  return true;
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.user.id).select("-password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json(user);
};

export const updateMyProfile = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const {
    name,
    username,
    mobile,
    city,
    state,
    gender,
    dob,
    bio,
    addressLine,
    country,
    postalCode,
    officeAddress,
    officeNumber
  } = req.body;

  if (name !== undefined) {
    if (!String(name).trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    user.name = String(name).trim();
  }

  if (username !== undefined) {
    const normalizedUsername = normalizeUsername(String(username));
    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (normalizedUsername !== user.username) {
      const existingUsername = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
    }

    user.username = normalizedUsername;
  }

  if (mobile !== undefined) {
    const nextMobile = String(mobile).trim();
    if (!nextMobile) {
      return res.status(400).json({ message: "Mobile cannot be empty" });
    }
    user.mobile = nextMobile;
  }

  if (city !== undefined) {
    const nextCity = String(city).trim();
    if (!nextCity) {
      return res.status(400).json({ message: "City cannot be empty" });
    }
    user.city = nextCity;
  }

  if (state !== undefined) {
    const nextState = String(state).trim();
    if (!nextState) {
      return res.status(400).json({ message: "State cannot be empty" });
    }
    user.state = nextState;
  }

  if (gender !== undefined) {
    const allowed = ["male", "female", "other", "prefer_not_to_say"];
    if (gender && !allowed.includes(String(gender))) {
      return res.status(400).json({ message: "Invalid gender value" });
    }
    user.gender = gender ? String(gender) as "male" | "female" | "other" | "prefer_not_to_say" : undefined;
  }

  if (dob !== undefined) {
    if (!dob) {
      user.dob = undefined;
    } else {
      const parsedDob = new Date(dob);
      if (Number.isNaN(parsedDob.getTime())) {
        return res.status(400).json({ message: "Invalid date of birth" });
      }
      user.dob = parsedDob;
    }
  }

  if (bio !== undefined) {
    user.bio = String(bio || "").trim() || undefined;
  }

  if (addressLine !== undefined) {
    user.addressLine = String(addressLine || "").trim() || undefined;
  }

  if (country !== undefined) {
    user.country = String(country || "").trim() || undefined;
  }

  if (postalCode !== undefined) {
    user.postalCode = String(postalCode || "").trim() || undefined;
  }

  if (user.role === "owner") {
    if (officeAddress !== undefined) {
      user.officeAddress = String(officeAddress || "").trim() || undefined;
    }

    if (officeNumber !== undefined) {
      user.officeNumber = String(officeNumber || "").trim() || undefined;
    }
  }

  await user.save();

  return res.json({ message: "Profile updated", user: await User.findById(user._id).select("-password") });
};

export const updateMySecurity = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { currentPassword, newPassword, newMobile } = req.body;

  if (!newPassword && !newMobile) {
    return res.status(400).json({ message: "No security changes provided" });
  }

  if (newMobile !== undefined) {
    const nextMobile = String(newMobile).trim();
    if (!nextMobile) {
      return res.status(400).json({ message: "Mobile cannot be empty" });
    }
    user.mobile = nextMobile;
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return res.status(400).json({ message: "Current password is required" });
    }

    const isMatch = await bcrypt.compare(String(currentPassword), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    if (!PASSWORD_REGEX.test(String(newPassword))) {
      return res.status(400).json({
        message:
          "Password must be 8+ chars with uppercase, lowercase, number and special character"
      });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
  }

  await user.save();

  if (newPassword !== undefined) {
    await sendPasswordChangedEmail(user.email);
  }

  return res.json({ message: "Security settings updated", user: await User.findById(user._id).select("-password") });
};

export const checkUsername = async (req: Request, res: Response) => {
  const username = normalizeUsername(req.body.username || "");

  if (username.length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters" });
  }

  const existing = await User.findOne({ username });
  return res.json({ available: !existing });
};

export const sendSignupOtp = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email || "");

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const existing = await User.findOne({ email });
  if (existing?.emailVerified) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const otp = await createOtp(email, "signup");
  await sendOtpEmail(email, otp, "Signup verification");

  return res.json({ message: "OTP sent to your email" });
};

export const verifySignupOtp = async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body.email || "");
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required" });
  }

  const ok = await verifyOtp(email, "signup", otp);
  if (!ok) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const signupToken = jwt.sign({ email, purpose: "signup_verified" }, JWT_SECRET, { expiresIn: "20m" });

  return res.json({ signupToken });
};

export const register = async (req: Request, res: Response) => {
  const {
    signupToken,
    name,
    email,
    role,
    username,
    mobile,
    city,
    state,
    password,
    officeAddress,
    officeNumber
  } = req.body;

  if (!signupToken) {
    return res.status(400).json({ message: "Email verification token is required" });
  }

  let decoded: { email: string; purpose: string };
  try {
    decoded = jwt.verify(signupToken, JWT_SECRET) as { email: string; purpose: string };
  } catch {
    return res.status(400).json({ message: "Invalid signup token" });
  }

  const normalizedEmail = normalizeEmail(email || "");
  if (decoded.purpose !== "signup_verified" || decoded.email !== normalizedEmail) {
    return res.status(400).json({ message: "Email verification mismatch" });
  }

  const selectedRole = role === "owner" ? "owner" : "user";
  const normalizedUsername = normalizeUsername(username || "");

  if (!PASSWORD_REGEX.test(password || "")) {
    return res.status(400).json({
      message:
        "Password must be 8+ chars with uppercase, lowercase, number and special character"
    });
  }

  if (!name || !normalizedEmail || !normalizedUsername || !mobile || !city || !state) {
    return res.status(400).json({ message: "All required fields must be filled" });
  }

  if (selectedRole === "owner" && (!officeAddress || !officeNumber)) {
    return res.status(400).json({ message: "Owner must provide office address and office number" });
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const existingUsername = await User.findOne({ username: normalizedUsername });
  if (existingUsername) {
    return res.status(400).json({ message: "Username already taken" });
  }

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email: normalizedEmail,
    username: normalizedUsername,
    mobile,
    city,
    state,
    password: hashed,
    role: selectedRole,
    emailVerified: true,
    officeAddress: selectedRole === "owner" ? officeAddress : undefined,
    officeNumber: selectedRole === "owner" ? officeNumber : undefined,
    ownerVerificationStatus: selectedRole === "owner" ? "pending" : undefined
  });

  return res.json({ message: "Registered successfully" });
};

export const login = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  if (!user.emailVerified) {
    return res.status(403).json({ message: "Please verify your email before login" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  return res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      role: user.role,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      city: user.city,
      state: user.state,
      officeAddress: user.officeAddress,
      officeNumber: user.officeNumber
    }
  });
};

export const requestForgotPasswordOtp = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || "").trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const otp = await createOtp(user.email, "forgot_password");
  await sendOtpEmail(user.email, otp, "Forgot password");

  return res.json({ message: "Password reset OTP sent to your email" });
};

export const verifyForgotPasswordOtp = async (req: Request, res: Response) => {
  const identifier = String(req.body.identifier || "").trim().toLowerCase();
  const otp = String(req.body.otp || "").trim();

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }]
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const ok = await verifyOtp(user.email, "forgot_password", otp);
  if (!ok) {
    return res.status(400).json({ message: "Invalid or expired OTP" });
  }

  const resetToken = jwt.sign({ userId: user._id, purpose: "password_reset" }, JWT_SECRET, {
    expiresIn: "15m"
  });

  return res.json({ resetToken });
};

export const resetPassword = async (req: Request, res: Response) => {
  const resetToken = String(req.body.resetToken || "");
  const newPassword = String(req.body.newPassword || "");

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({
      message:
        "Password must be 8+ chars with uppercase, lowercase, number and special character"
    });
  }

  let decoded: { userId: string; purpose: string };
  try {
    decoded = jwt.verify(resetToken, JWT_SECRET) as { userId: string; purpose: string };
  } catch {
    return res.status(400).json({ message: "Invalid or expired reset token" });
  }

  if (decoded.purpose !== "password_reset") {
    return res.status(400).json({ message: "Invalid reset token" });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await sendPasswordChangedEmail(user.email);

  return res.json({ message: "Password reset successful" });
};

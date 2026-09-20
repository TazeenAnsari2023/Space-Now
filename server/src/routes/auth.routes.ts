import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  checkUsername,
  getMe,
  login,
  register,
  requestForgotPasswordOtp,
  resetPassword,
  sendSignupOtp,
  updateMyProfile,
  updateMySecurity,
  verifyForgotPasswordOtp,
  verifySignupOtp
} from "../controllers/auth.controller";

const router = Router();

router.get("/me", verifyToken, getMe);
router.put("/me/profile", verifyToken, updateMyProfile);
router.put("/me/security", verifyToken, updateMySecurity);
router.post("/check-username", checkUsername);
router.post("/send-signup-otp", sendSignupOtp);
router.post("/verify-signup-otp", verifySignupOtp);
router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password/request", requestForgotPasswordOtp);
router.post("/forgot-password/verify", verifyForgotPasswordOtp);
router.post("/forgot-password/reset", resetPassword);

export default router;

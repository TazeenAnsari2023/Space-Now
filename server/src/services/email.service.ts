import dotenv from "dotenv";
import path from "path";
import nodemailer from "nodemailer";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || "no-reply@spacenow.dev";

const smtpReady = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    })
  : null;

export const sendEmail = async ({
  to,
  subject,
  html,
  text
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  if (!transporter) {
    throw new Error("SMTP is not configured. Please set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
    html
  });

  console.log("[MAIL]", {
    to,
    subject,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response
  });

  return info;
};

export const sendOtpEmail = async (email: string, otp: string, purposeLabel: string) => {
  await sendEmail({
    to: email,
    subject: `Your ${purposeLabel} OTP - Space Now`,
    text: `Your OTP is ${otp}. It is valid for 10 minutes.`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6">
        <h2>Space Now Verification</h2>
        <p>Your OTP for <strong>${purposeLabel}</strong> is:</p>
        <h1 style="letter-spacing:4px">${otp}</h1>
        <p>This OTP is valid for 10 minutes.</p>
      </div>
    `
  });
};

export const sendPasswordChangedEmail = async (email: string) => {
  await sendEmail({
    to: email,
    subject: "Password changed successfully - Space Now",
    text: "Your Space Now account password was changed successfully.",
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6">
        <h2>Password Updated</h2>
        <p>Your Space Now account password was changed successfully.</p>
      </div>
    `
  });
};

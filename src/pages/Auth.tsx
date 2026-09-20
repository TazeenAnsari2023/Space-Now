import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  checkUsername,
  loginUser,
  registerUser,
  requestForgotPasswordOtp,
  resetPassword,
  sendSignupOtp,
  verifyForgotPasswordOtp,
  verifySignupOtp
} from "../services/auth";

type Mode = "login" | "signup";

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const createCaptcha = () => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b) };
};

function Auth() {
  const location = useLocation();
  const navigate = useNavigate();

  const initialMode: Mode = location.pathname === "/register" ? "signup" : "login";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [loginCaptcha, setLoginCaptcha] = useState(createCaptcha());
  const [signupCaptcha, setSignupCaptcha] = useState(createCaptcha());

  const [loginData, setLoginData] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
    captchaInput: ""
  });

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotData, setForgotData] = useState({
    identifier: "",
    otp: "",
    resetToken: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [signupStep, setSignupStep] = useState(1);
  const [signupStep1, setSignupStep1] = useState({
    name: "",
    email: "",
    role: "user" as "user" | "owner",
    captchaInput: "",
    otp: "",
    otpSent: false,
    signupToken: ""
  });

  const [signupStep2, setSignupStep2] = useState({
    username: "",
    mobile: "",
    city: "",
    state: "",
    password: "",
    confirmPassword: "",
    officeAddress: "",
    officeNumber: ""
  });

  const [usernameStatus, setUsernameStatus] = useState<"unknown" | "checking" | "available" | "taken">("unknown");

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const canProceedSignup = useMemo(
    () => Boolean(signupStep1.signupToken),
    [signupStep1.signupToken]
  );

  const validateCaptcha = (expected: string, got: string) => expected === got.trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!validateCaptcha(loginCaptcha.answer, loginData.captchaInput)) {
      setMessage("Captcha verification failed.");
      setLoginCaptcha(createCaptcha());
      setLoginData((prev) => ({ ...prev, captchaInput: "" }));
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser({
        identifier: loginData.identifier,
        password: loginData.password
      });

      localStorage.setItem("token", res.token);
      localStorage.setItem("role", res.user.role);
      localStorage.setItem("userId", String(res.user.id || ""));
      localStorage.setItem("name", res.user.name || "");
      localStorage.setItem("email", res.user.email || "");
      localStorage.setItem("username", res.user.username || "");

      if (res.user.role === "owner") {
        navigate("/owner/dashboard");
      } else if (res.user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setMessage("");

    if (!validateCaptcha(signupCaptcha.answer, signupStep1.captchaInput)) {
      setMessage("Captcha verification failed.");
      setSignupCaptcha(createCaptcha());
      setSignupStep1((prev) => ({ ...prev, captchaInput: "" }));
      return;
    }

    if (!signupStep1.name || !signupStep1.email) {
      setMessage("Name and email are required.");
      return;
    }

    try {
      setLoading(true);
      await sendSignupOtp({ email: signupStep1.email });
      setSignupStep1((prev) => ({ ...prev, otpSent: true }));
      setMessage("OTP sent to your email.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setMessage("");

    try {
      setLoading(true);
      const res = await verifySignupOtp({ email: signupStep1.email, otp: signupStep1.otp });
      setSignupStep1((prev) => ({ ...prev, signupToken: res.signupToken }));
      setSignupStep(2);
      setMessage("Email verified. Continue with profile details.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async () => {
    if (!signupStep2.username || signupStep2.username.length < 3) {
      setUsernameStatus("unknown");
      return;
    }

    try {
      setUsernameStatus("checking");
      const res = await checkUsername({ username: signupStep2.username });
      setUsernameStatus(res.available ? "available" : "taken");
    } catch {
      setUsernameStatus("unknown");
    }
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!canProceedSignup) {
      setMessage("Verify your email first.");
      return;
    }

    if (!passwordRule.test(signupStep2.password)) {
      setMessage("Password must be 8+ chars with uppercase, lowercase, number and special char.");
      return;
    }

    if (signupStep2.password !== signupStep2.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (signupStep1.role === "owner" && (!signupStep2.officeAddress || !signupStep2.officeNumber)) {
      setMessage("Owner must provide office address and office number.");
      return;
    }

    if (usernameStatus === "taken") {
      setMessage("Username already taken.");
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        signupToken: signupStep1.signupToken,
        name: signupStep1.name,
        email: signupStep1.email,
        role: signupStep1.role,
        username: signupStep2.username,
        mobile: signupStep2.mobile,
        city: signupStep2.city,
        state: signupStep2.state,
        password: signupStep2.password,
        officeAddress: signupStep1.role === "owner" ? signupStep2.officeAddress : undefined,
        officeNumber: signupStep1.role === "owner" ? signupStep2.officeNumber : undefined
      });

      setMode("login");
      navigate("/login");
      setMessage("Signup completed. Please login.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const requestForgotOtp = async () => {
    setMessage("");

    try {
      setLoading(true);
      await requestForgotPasswordOtp({ identifier: forgotData.identifier });
      setForgotStep(2);
      setMessage("OTP sent for password reset.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyForgotOtpFlow = async () => {
    setMessage("");

    try {
      setLoading(true);
      const res = await verifyForgotPasswordOtp({
        identifier: forgotData.identifier,
        otp: forgotData.otp
      });
      setForgotData((prev) => ({ ...prev, resetToken: res.resetToken }));
      setForgotStep(3);
      setMessage("OTP verified. Set new password.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetForgotPassword = async () => {
    setMessage("");

    if (!passwordRule.test(forgotData.newPassword)) {
      setMessage("New password does not meet password policy.");
      return;
    }

    if (forgotData.newPassword !== forgotData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      await resetPassword({ resetToken: forgotData.resetToken, newPassword: forgotData.newPassword });
      setForgotOpen(false);
      setForgotStep(1);
      setForgotData({ identifier: "", otp: "", resetToken: "", newPassword: "", confirmPassword: "" });
      setMessage("Password reset complete. Please login.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-card surface-card">
        <div className="auth-visual" />

        <div className="auth-form-wrap">
          <div className="auth-switch row">
            <button
              type="button"
              className={`btn ${mode === "login" ? "btn-primary" : "btn-outline"}`}
              onClick={() => {
                setMode("login");
                navigate("/login");
              }}
            >
              Log In
            </button>
            <button
              type="button"
              className={`btn ${mode === "signup" ? "btn-primary" : "btn-outline"}`}
              onClick={() => {
                setMode("signup");
                navigate("/register");
              }}
            >
              Sign Up
            </button>
          </div>

          {mode === "login" ? (
            <form className="form-grid" onSubmit={handleLogin}>
              <h2 className="page-title">Log in and explore Space Now</h2>

              <label className="field">
                Email or Username
                <input
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                  placeholder="Email or username"
                  required
                />
              </label>

              <label className="field">
                Password
                <input
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  placeholder="Password"
                  required
                />
              </label>

              <label className="field">
                Human Captcha: {loginCaptcha.question}
                <input
                  value={loginData.captchaInput}
                  onChange={(e) => setLoginData({ ...loginData, captchaInput: e.target.value })}
                  placeholder="Enter result"
                  required
                />
              </label>

              <div className="row" style={{ justifyContent: "space-between" }}>
                <label className="row">
                  <input
                    type="checkbox"
                    checked={loginData.rememberMe}
                    onChange={(e) => setLoginData({ ...loginData, rememberMe: e.target.checked })}
                  />
                  Remember Me
                </label>

                <button type="button" className="btn btn-outline" onClick={() => setForgotOpen((p) => !p)}>
                  Forgot Password
                </button>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Please wait..." : "LOGIN"}
              </button>
            </form>
          ) : (
            <div className="form-grid">
              <h2 className="page-title">Create account</h2>

              {signupStep === 1 ? (
                <>
                  <label className="field">
                    Full Name
                    <input
                      value={signupStep1.name}
                      onChange={(e) => setSignupStep1({ ...signupStep1, name: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    Email
                    <input
                      type="email"
                      value={signupStep1.email}
                      onChange={(e) => setSignupStep1({ ...signupStep1, email: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    Account Type
                    <select
                      value={signupStep1.role}
                      onChange={(e) => setSignupStep1({ ...signupStep1, role: e.target.value as "user" | "owner" })}
                    >
                      <option value="user">User</option>
                      <option value="owner">Owner (wants to list place)</option>
                    </select>
                  </label>

                  <label className="field">
                    Human Captcha: {signupCaptcha.question}
                    <input
                      value={signupStep1.captchaInput}
                      onChange={(e) => setSignupStep1({ ...signupStep1, captchaInput: e.target.value })}
                      placeholder="Enter result"
                      required
                    />
                  </label>

                  <div className="row">
                    <button type="button" className="btn btn-outline" onClick={() => void sendOtp()} disabled={loading}>
                      Send OTP
                    </button>
                    {signupStep1.otpSent && (
                      <>
                        <input
                          value={signupStep1.otp}
                          onChange={(e) => setSignupStep1({ ...signupStep1, otp: e.target.value })}
                          placeholder="6-digit OTP"
                        />
                        <button type="button" className="btn btn-primary" onClick={() => void verifyOtp()} disabled={loading}>
                          Verify OTP
                        </button>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <form className="form-grid" onSubmit={submitSignup}>
                  <label className="field">
                    Unique Username
                    <input
                      value={signupStep2.username}
                      onBlur={() => void checkUsernameAvailability()}
                      onChange={(e) => {
                        setUsernameStatus("unknown");
                        setSignupStep2({ ...signupStep2, username: e.target.value });
                      }}
                      required
                    />
                  </label>

                  {usernameStatus === "checking" && <small>Checking username...</small>}
                  {usernameStatus === "available" && <small style={{ color: "green" }}>Username available</small>}
                  {usernameStatus === "taken" && <small className="error-text">Username already taken</small>}

                  <label className="field">
                    Mobile Number
                    <input
                      value={signupStep2.mobile}
                      onChange={(e) => setSignupStep2({ ...signupStep2, mobile: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    City
                    <input
                      value={signupStep2.city}
                      onChange={(e) => setSignupStep2({ ...signupStep2, city: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    State
                    <input
                      value={signupStep2.state}
                      onChange={(e) => setSignupStep2({ ...signupStep2, state: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    Password
                    <input
                      type="password"
                      value={signupStep2.password}
                      onChange={(e) => setSignupStep2({ ...signupStep2, password: e.target.value })}
                      required
                    />
                  </label>

                  <label className="field">
                    Re-enter Password
                    <input
                      type="password"
                      value={signupStep2.confirmPassword}
                      onChange={(e) => setSignupStep2({ ...signupStep2, confirmPassword: e.target.value })}
                      required
                    />
                  </label>

                  {signupStep1.role === "owner" && (
                    <>
                      <label className="field">
                        Office Address
                        <input
                          value={signupStep2.officeAddress}
                          onChange={(e) => setSignupStep2({ ...signupStep2, officeAddress: e.target.value })}
                          required
                        />
                      </label>

                      <label className="field">
                        Office Number
                        <input
                          value={signupStep2.officeNumber}
                          onChange={(e) => setSignupStep2({ ...signupStep2, officeNumber: e.target.value })}
                          required
                        />
                      </label>
                    </>
                  )}

                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? "Please wait..." : "Complete Signup"}
                  </button>
                </form>
              )}
            </div>
          )}

          {message && <p className="error-text">{message}</p>}

          {forgotOpen && (
            <div className="surface-card forgot-box">
              <h3>Forgot Password</h3>
              {forgotStep === 1 && (
                <div className="form-grid">
                  <label className="field">
                    Username or Email
                    <input
                      value={forgotData.identifier}
                      onChange={(e) => setForgotData({ ...forgotData, identifier: e.target.value })}
                    />
                  </label>
                  <button className="btn btn-primary" type="button" onClick={() => void requestForgotOtp()}>
                    Request OTP
                  </button>
                </div>
              )}

              {forgotStep === 2 && (
                <div className="form-grid">
                  <label className="field">
                    Enter 6-digit OTP
                    <input
                      value={forgotData.otp}
                      onChange={(e) => setForgotData({ ...forgotData, otp: e.target.value })}
                    />
                  </label>
                  <button className="btn btn-primary" type="button" onClick={() => void verifyForgotOtpFlow()}>
                    Verify OTP
                  </button>
                </div>
              )}

              {forgotStep === 3 && (
                <div className="form-grid">
                  <label className="field">
                    New Password
                    <input
                      type="password"
                      value={forgotData.newPassword}
                      onChange={(e) => setForgotData({ ...forgotData, newPassword: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    Confirm Password
                    <input
                      type="password"
                      value={forgotData.confirmPassword}
                      onChange={(e) => setForgotData({ ...forgotData, confirmPassword: e.target.value })}
                    />
                  </label>
                  <button className="btn btn-primary" type="button" onClick={() => void resetForgotPassword()}>
                    Reset Password
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Auth;

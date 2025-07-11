import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getMe,
  login,
  signup,
  requestPasswordReset,
  resetPassword,
} from "../api/apiRoutes.js";
import Modal from "./Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/navbar.css";

// --- UI Subcomponents ---
const Divider = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      margin: "1.25rem 0",
    }}
  >
    <span style={{ flex: 1, height: "1px", background: "#555" }} />
    <span style={{ fontSize: "0.85rem", color: "#888" }}>OR</span>
    <span style={{ flex: 1, height: "1px", background: "#555" }} />
  </div>
);

const GoogleAuthButton = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="button-secondary"
    style={{ width: "100%" }}
  >
    Continue with Google
  </button>
);

const PromptLink = ({ question, linkText, onClick }) => (
  <p style={{ marginTop: "1.5rem", textAlign: "left", fontSize: "0.95rem" }}>
    {question}{" "}
    <span
      onClick={onClick}
      style={{
        color: "#007bff",
        textDecoration: "underline",
        cursor: "pointer",
      }}
    >
      {linkText}
    </span>
  </p>
);

// --- OAuth Config ---
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;
const SCOPE =
  "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid";

// --- Main Component ---
export default function PublicNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const code = params.get("code");

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (token) {
      setResetToken(token);
      setShowResetModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!document.cookie.includes("token=")) return;

    getMe()
      .then((res) => {
        setUser(res.data);
        const next =
          params.get("next") || localStorage.getItem("google_redirect_next");
        localStorage.removeItem("google_redirect_next");
        navigate(next || "/app/dashboard");
      })
      .catch(() => {});
  }, [location, navigate, setUser]);

  useEffect(() => {
    const handleOpenSignup = () => setShowSignup(true);
    window.addEventListener("open-signup", handleOpenSignup);
    return () => window.removeEventListener("open-signup", handleOpenSignup);
  }, []);

  const closeModals = () => {
    setShowLogin(false);
    setShowSignup(false);
    setErrors({});
    setForm({ email: "", password: "" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validate = () => {
    if (!form.email || !form.password) {
      setErrors({ form: "Invalid credentials." });
      return false;
    }
    return true;
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setForgotMessage("");

    try {
      await requestPasswordReset(forgotEmail);
      setForgotMessage(
        "If your account supports password login, a reset link has been sent.",
      );
    } catch {
      setForgotMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResetMessage("");

    try {
      await resetPassword({ token: resetToken, password: newPassword });
      setResetMessage("Password reset successful. You can now log in.");
    } catch {
      setResetMessage("Reset failed. Link may be expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await login(form);
      const me = await getMe();
      setUser(me.data);

      const params = new URLSearchParams(location.search);
      const next =
        params.get("next") || localStorage.getItem("google_redirect_next");
      localStorage.removeItem("google_redirect_next");

      navigate(next || "/app/dashboard");
    } catch {
      setErrors({ form: "Invalid credentials." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      await signup(form);
      const me = await getMe();
      setUser(me.data);

      const params = new URLSearchParams(location.search);
      const next =
        params.get("next") || localStorage.getItem("google_redirect_next");
      localStorage.removeItem("google_redirect_next");

      navigate(next || "/app/dashboard");
    } catch {
      setErrors({ form: "Signup failed." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRedirect = () => {
    const params = new URLSearchParams(location.search);
    const next = params.get("next");
    if (next) localStorage.setItem("google_redirect_next", next);

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}&access_type=offline&prompt=consent`;
  };

  return (
    <>
      {/* Main Navbar */}
      <header className="navbar public-navbar">
        <div className="navbar-content">
          <a href="/" className="navbar-logo">
            <img src="/logo.ico" alt="logo" className="logo-img" />
            <span className="logo-text">Streamline</span>
          </a>
          <div className="navbar-section">
            <nav className="navbar-links">
              <span className="nav-link" onClick={() => setShowLogin(true)}>
                Log in
              </span>
              <button
                className="button-primary"
                onClick={() => setShowSignup(true)}
              >
                Create an account
              </button>
            </nav>
            <button
              className="menu-toggle"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              setShowLogin(true);
            }}
            className="button-secondary"
          >
            Log in
          </button>
          <button
            onClick={() => {
              setMenuOpen(false);
              setShowSignup(true);
            }}
            className="button-primary"
          >
            Create an account
          </button>
        </div>
      )}

      {/* Login Modal */}
      <Modal
        isOpen={showLogin}
        onClose={closeModals}
        title="Log In"
        fields={[
          { label: "Email", name: "email", type: "email" },
          { label: "Password", name: "password", type: "password" },
        ]}
        formData={form}
        onChange={handleChange}
        onSubmit={handleLoginSubmit}
        errors={errors}
        loading={loading}
        submitLabel="Log In"
        actions={
          <>
            <PromptLink
              question="Forgot your password?"
              linkText="Reset it"
              onClick={() => {
                closeModals();
                setShowForgotPassword(true);
              }}
            />
            <Divider />
            <GoogleAuthButton
              onClick={handleGoogleRedirect}
              disabled={loading}
            />
            <PromptLink
              question="Don’t have an account?"
              linkText="Sign up"
              onClick={() => {
                closeModals();
                setShowSignup(true);
              }}
            />
          </>
        }
      />

      {/* Signup Modal */}
      <Modal
        isOpen={showSignup}
        onClose={closeModals}
        title="Sign Up"
        fields={[
          { label: "Email", name: "email", type: "email" },
          { label: "Password", name: "password", type: "password" },
        ]}
        formData={form}
        onChange={handleChange}
        onSubmit={handleSignupSubmit}
        errors={errors}
        loading={loading}
        submitLabel="Sign Up"
        actions={
          <>
            <Divider />
            <GoogleAuthButton
              onClick={handleGoogleRedirect}
              disabled={loading}
            />
            <PromptLink
              question="Already have an account?"
              linkText="Log in"
              onClick={() => {
                closeModals();
                setShowLogin(true);
              }}
            />
          </>
        }
      />

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotPassword}
        onClose={() => {
          setShowForgotPassword(false);
          setForgotEmail("");
          setForgotMessage("");
        }}
        title="Reset Password"
        fields={[{ label: "Email", name: "forgotEmail", type: "email" }]}
        formData={{ forgotEmail }}
        onChange={(e) => setForgotEmail(e.target.value)}
        onSubmit={handleForgotPassword}
        errors={forgotMessage ? { form: forgotMessage } : {}}
        loading={loading}
        submitLabel="Send Reset Link"
      />

      {/* Reset Token Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetToken("");
          setNewPassword("");
          setResetMessage("");
        }}
        title="Set a New Password"
        fields={[
          { label: "New Password", name: "newPassword", type: "password" },
        ]}
        formData={{ newPassword }}
        onChange={(e) => setNewPassword(e.target.value)}
        onSubmit={handleResetPassword}
        errors={resetMessage ? { form: resetMessage } : {}}
        loading={loading}
        submitLabel="Reset Password"
      />
    </>
  );
}

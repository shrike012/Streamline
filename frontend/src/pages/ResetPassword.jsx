import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { resetPassword } from "../api/apiRoutes";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      await resetPassword(token, password);
      setMessage("Password updated successfully.");
    } catch {
      setError("Reset failed. Try again.");
    }
  };

  return (
    <>
      <Helmet>
        <title>Reset Password</title>
      </Helmet>
      <div className="page-content">
        <h1>Reset Password</h1>

        {message ? (
          <p style={{ paddingTop: "1rem", color: "#4caf50" }}>{message}</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="input-group-row"
            style={{
              gap: "1rem",
              marginTop: "2rem",
              flexDirection: "column",
              alignItems: "flex-start",
              maxWidth: "500px",
            }}
          >
            {error && (
              <p className="error-message" style={{ marginBottom: "0.5rem" }}>
                {error}
              </p>
            )}

            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className="form-input"
              style={{ width: "100%" }}
              required
            />

            <button
              type="submit"
              className="button-primary"
              style={{ width: "100%" }}
            >
              Reset Password
            </button>
          </form>
        )}
      </div>
    </>
  );
}

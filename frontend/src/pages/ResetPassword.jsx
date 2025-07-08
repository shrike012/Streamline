import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/apiRoutes";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await resetPassword(token, password);
      setMessage("Password updated successfully.");
    } catch {
      setMessage("Reset failed.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Reset Password</h2>
      {message ? (
        <p>{message}</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Reset</button>
        </form>
      )}
    </div>
  );
}

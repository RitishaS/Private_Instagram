import React, { useState } from "react";
import axios from "axios";
import { FiLock, FiUser } from "react-icons/fi";
import { API_BASE_URL } from "../config";
import "./Styles.css";
import "./LoginPremium.css";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password,
      });

      if (response.data.success) {
        onLoginSuccess(username, password);
      } else {
        setError(response.data.error || "Invalid credentials");
      }
    } catch (error) {
      setError(error.response?.data?.error || "Invalid credentials");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-aurora login-aurora-one" aria-hidden="true" />
      <div className="login-aurora login-aurora-two" aria-hidden="true" />
      <div className="login-aurora login-aurora-three" aria-hidden="true" />
      <div className="login-sparkles" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <div className="login-box">
        <div className="login-shine" aria-hidden="true" />
        <div className="login-eyebrow"><span>✦</span> a little space for us</div>
        <h1 className="login-title">Our Little World</h1>
        <p className="login-subtitle">A private corner for every memory, moment, and smile.</p>
        <form onSubmit={handleLogin} className="login-form">
          <label className="login-field">
            <span className="sr-only">Username</span>
            <FiUser aria-hidden="true" />
            <input type="text" placeholder="Your username" value={username} onChange={(e) => setUsername(e.target.value)} className="login-input" autoComplete="username" disabled={loading} required />
          </label>
          <label className="login-field">
            <span className="sr-only">Password</span>
            <FiLock aria-hidden="true" />
            <input type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" autoComplete="current-password" disabled={loading} required />
          </label>
          <button type="submit" className="login-button" disabled={loading}>
            <span>{loading ? "Opening your world..." : "Come on in"}</span>
            {loading && <span className="login-loader" aria-hidden="true" />}
          </button>
        </form>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="login-footer">Made for just the two of us <span aria-hidden="true">✦</span></p>
      </div>
    </div>
  );
}

export default Login;

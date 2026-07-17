import React, { useState } from "react";
import axios from "axios";
import "./Styles.css";

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
      const response = await axios.post("http://localhost:3000/login", {
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
      <div className="login-box">
        <h1 className="login-title">Private Couple Instagram</h1>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            disabled={loading}
          />
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        {error && <p className="error-message">{error}</p>}
       
      </div>
    </div>
  );
}

export default Login;

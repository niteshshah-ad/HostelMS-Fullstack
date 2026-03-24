import { Link } from "react-router-dom";
import { useState } from "react";
import MachanLogo from "../components/MachanLogo";
import ThemeToggle from "../components/ThemeToggle";
import { getApiUrl } from "../lib/api";
import "../Styles/login.css";

const STUDENT_CURRENT_AREA_STORAGE_KEY = "student_current_area";
const STUDENT_CURRENT_AREA_SESSION_KEY = "student_current_area_session";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentArea, setCurrentArea] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role);
        if (data.role === "student") {
          localStorage.removeItem(STUDENT_CURRENT_AREA_STORAGE_KEY);
          sessionStorage.removeItem(STUDENT_CURRENT_AREA_SESSION_KEY);

          if (currentArea.trim()) {
            sessionStorage.setItem(STUDENT_CURRENT_AREA_SESSION_KEY, currentArea.trim());
          }
        }
        if (data.role === "student") window.location.href = "/student-dashboard";
        if (data.role === "warden") window.location.href = "/warden-dashboard";
        if (data.role === "admin") window.location.href = "/admin-dashboard";
      } else {
        setMessage(data.detail || "Login failed");
      }
    } catch {
      setMessage("Server Error");
    }
  };

  return (
    <div className="login-page">
      <div className="login-logo-wrap">
        <MachanLogo subtitle="Welcome Back" />
        <ThemeToggle />
      </div>

      <section className="login-showcase">
        <div className="login-showcase-copy">
          <span className="login-kicker">Welcome Back To Machan</span>
          <h1>Login to manage stays, bookings, and a better hostel experience.</h1>
          <p>
            Students can revisit bookings and shortlist options. Wardens can manage hostels,
            bookings, and revenue with more clarity from one place.
          </p>
        </div>

        <div className="login-showcase-card">
          <span>Why Machan</span>
          <strong>Cleaner booking journeys, stronger trust, and calmer hostel management.</strong>
        </div>
      </section>

      <section className="login-panel">
        <Link className="login-back-link" to="/home">Back to Home</Link>
        <h2>Login</h2>
        <p>Use your registered account to continue.</p>

        <form className="login-form" onSubmit={handleLogin}>
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Current Area</span>
            <input
              type="text"
              placeholder="Example: Gopalganj, Bihar"
              value={currentArea}
              onChange={(event) => setCurrentArea(event.target.value)}
            />
          </label>

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>

        {message && <p className="login-message">{message}</p>}

        <p className="login-switch">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
      </section>

      <div className="login-footer-note">All rights reserved @ Machan.</div>
    </div>
  );
}

export default LoginPage;

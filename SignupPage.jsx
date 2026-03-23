import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import MachanLogo from "../components/MachanLogo";
import ThemeToggle from "../components/ThemeToggle";
import { getApiUrl } from "../lib/api";
import "../Styles/signup.css";

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const navigate = useNavigate();

  const validateForm = () => {
    const nextErrors = {};

    if (!NAME_PATTERN.test(formData.name.trim())) {
      nextErrors.name = "Enter a valid name using letters only.";
    }

    if (!EMAIL_PATTERN.test(formData.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!STRONG_PASSWORD_PATTERN.test(formData.password)) {
      nextErrors.password = "Use 8+ characters with uppercase, lowercase, number, and symbol.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [event.target.name]: "",
    }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!validateForm()) return;

    try {
      const response = await fetch(getApiUrl("/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Signup successful. Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        setMessage(data.detail || "Signup failed");
      }
    } catch {
      setMessage("Server Error");
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-logo-wrap">
        <MachanLogo subtitle="Create Account" />
        <ThemeToggle />
      </div>

      <section className="signup-showcase">
        <span className="signup-kicker">Join Machan</span>
        <h1>Create your account and start using a more thoughtful hostel platform.</h1>
        <p>
          Whether you are a student looking for a stay or a warden managing rooms and bookings,
          Machan keeps the journey more trustworthy and easier to follow.
        </p>
      </section>

      <section className="signup-panel">
        <Link className="signup-back-link" to="/home">Back to Home</Link>
        <h2>Create Account</h2>
        <p>Set up your profile to continue with Machan.</p>

        <form className="signup-form" onSubmit={handleSignup}>
          <label>
            <span>Full Name</span>
            <input
              type="text"
              name="name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
            {fieldErrors.name ? <small className="signup-field-error">{fieldErrors.name}</small> : null}
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
            {fieldErrors.email ? <small className="signup-field-error">{fieldErrors.email}</small> : null}
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <small className="signup-field-hint">
              Strong password: use uppercase, lowercase, number, and symbol.
            </small>
            {fieldErrors.password ? <small className="signup-field-error">{fieldErrors.password}</small> : null}
          </label>

          <label>
            <span>Role</span>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="warden">Warden</option>
            </select>
          </label>

          <button type="submit">Sign Up</button>
        </form>

        {message && <p className="signup-message">{message}</p>}

        <p className="signup-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>

      <div className="signup-footer-note">All rights reserved @ Machan.</div>
    </div>
  );
}

export default SignupPage;

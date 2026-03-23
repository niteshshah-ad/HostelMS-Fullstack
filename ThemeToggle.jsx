import { useEffect, useState } from "react";
import "../Styles/themetoggle.css";

const getStoredTheme = () => {
  const savedTheme = localStorage.getItem("machan-theme");
  return savedTheme === "dark" ? "dark" : "light";
};

function ThemeToggle() {
  const [theme, setTheme] = useState(getStoredTheme);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem("machan-theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {theme === "dark" ? "☾" : "◐"}
      </span>
      <span>{theme === "dark" ? "White Mode" : "Dark Mode"}</span>
    </button>
  );
}

export default ThemeToggle;

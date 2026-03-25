import { Link } from "react-router-dom";
import "../Styles/machanlogo.css";

function MachanLogo({ className = "", compact = false, subtitle = "" }) {
  const classes = ["machan-logo", compact ? "compact" : "", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} to="/">
      <span className="machan-logo-badge" aria-hidden="true">
        <img className="machan-logo-image" src="/Machan_logo.png" alt="" />
      </span>
      {subtitle ? (
        <span className="machan-logo-copy">
          <small>{subtitle}</small>
        </span>
      ) : null}
    </Link>
  );
}

export default MachanLogo;

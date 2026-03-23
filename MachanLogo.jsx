import { Link } from "react-router-dom";
import "../Styles/machanlogo.css";

function MachanLogo({ className = "", compact = false, subtitle = "" }) {
  const classes = ["machan-logo", compact ? "compact" : "", className].filter(Boolean).join(" ");

  return (
    <Link className={classes} to="/">
      <span className="machan-logo-mark" aria-hidden="true">
        <span className="machan-logo-mark-core">M</span>
      </span>
      <span className="machan-logo-copy">
        <strong>Machan</strong>
        {subtitle ? <small>{subtitle}</small> : null}
      </span>
    </Link>
  );
}

export default MachanLogo;

import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MachanLogo from "../components/MachanLogo";
import ThemeToggle from "../components/ThemeToggle";
import "../Styles/home.css";

const showcaseImages = [
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
];
const DEVELOPER_NAME = "Nitesh";
const DEVELOPER_PHONE = "9555347017";
const DEVELOPER_EMAIL = "niteshkumargupta219@gmail.com";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/invites/contact/?utm_source=ig_contact_invite&utm_medium=copy_link&utm_content=pic74e3",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.3" cy="6.7" r="1.1" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1AUpNEuzU7/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M13.4 20.5v-7h2.4l.4-2.9h-2.8V8.8c0-.9.3-1.5 1.5-1.5h1.4V4.7c-.2 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.4v7h3z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M17.7 4h2.8l-6.1 7 7.2 9h-5.7l-4.5-5.8-5.1 5.8H3.5l6.5-7.4L3 4h5.8l4 5.2L17.7 4z" />
      </svg>
    ),
  },
];

function HomePage() {
  const [searchParams] = useSearchParams();
  const aboutSectionRef = useRef(null);

  useEffect(() => {
    if (searchParams.get("section") === "about") {
      aboutSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  return (
    <div className="home-page">
      <header className="home-nav">
        <div className="home-nav-brand">
          <MachanLogo subtitle="Student Living" />
          <ThemeToggle />
        </div>

        <nav className="home-nav-links">
          <Link to="/login">Login</Link>
          <Link to="/student-dashboard">Home</Link>
          <Link className="home-signup-btn" to="/signup">
            Sign Up
          </Link>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-copy">
            <span className="home-kicker">Student Living, Reimagined</span>
            <h1>Machan makes hostel life feel warm, safe, and beautifully simple.</h1>
            <p>
              Discover modern student stays, clearer booking journeys, trusted warden support,
              and a space that feels designed for real campus life instead of generic listings.
            </p>

            <div className="home-actions">
              <Link className="home-primary-btn" to="/login">
                Login
              </Link>

              <div className="home-social-links" aria-label="Social media links">
                {socialLinks.map((item) => (
                  <a
                    key={item.label}
                    className="home-social-link"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                  >
                    {item.icon}
                  </a>
                ))}
              </div>
            </div>

            <div className="home-stat-row">
              <div>
                <strong>Smart booking</strong>
                <span>OTP, ID proof, and warden visibility built in</span>
              </div>
              <div>
                <strong>Student-first</strong>
                <span>Simple stays, clear filters, faster decisions</span>
              </div>
            </div>
          </div>

          <div className="home-gallery">
            <article className="home-gallery-card large">
              <img src={showcaseImages[0]} alt="Machan premium hostel room" />
              <div>
                <span>Machan Signature</span>
                <strong>Spaces that feel calm after a long college day</strong>
              </div>
            </article>

            <article className="home-gallery-card">
              <img src={showcaseImages[1]} alt="Machan shared room" />
              <div>
                <span>Comfortable Rooms</span>
                <strong>Clean layouts, better light, real comfort</strong>
              </div>
            </article>

            <article className="home-gallery-card">
              <img src={showcaseImages[2]} alt="Machan common area" />
              <div>
                <span>Community Spaces</span>
                <strong>Quiet corners to study and reset</strong>
              </div>
            </article>
          </div>
        </section>

        <section className="home-about" id="about" ref={aboutSectionRef}>
          <div className="home-about-copy">
            <span className="home-kicker">About Machan</span>
            <h2>A hostel platform built for trust, clarity, and a better daily experience.</h2>
            <p>
              Machan is designed to help students choose with confidence and help wardens manage
              their hostels with less noise. From authentic listings to smoother booking details,
              the goal is simple: reduce confusion and make hostel living feel more dependable.
            </p>
          </div>

          <div className="home-about-grid">
            <div>
              <strong>Verified booking flow</strong>
              <p>Payments, OTP verification, and ID proof reduce fake requests and improve trust.</p>
            </div>
            <div>
              <strong>Warden visibility</strong>
              <p>Wardens can review booking details for only the hostels they actually manage.</p>
            </div>
            <div>
              <strong>Student-first discovery</strong>
              <p>Search, compare, shortlist, and revisit bookings without losing context.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-brand">
          <span>Machan</span>
          <p>Thoughtful hostel living for students and wardens.</p>
          <small>All rights reserved @ Machan.</small>
        </div>
        <div className="home-footer-developer">
          <strong>Developed by {DEVELOPER_NAME}</strong>
          <p>If you want a similar website or web app, contact the developer directly.</p>
          <a href={`tel:${DEVELOPER_PHONE}`}>Call: {DEVELOPER_PHONE}</a>
          <a href={`mailto:${DEVELOPER_EMAIL}`}>Email: {DEVELOPER_EMAIL}</a>
        </div>
        <div className="home-footer-links">
          <Link to="/login">Login</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;

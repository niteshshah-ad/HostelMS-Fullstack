import "../Styles/studentfooter.css";

const DEVELOPER_NAME = "Nitesh";
const DEVELOPER_PHONE = "9555347017";
const DEVELOPER_EMAIL = "niteshkumargupta219@gmail.com";

function StudentFooter({ hostelsCount, wishlistCount, filteredCount }) {
  return (
    <footer className="student-footer">
      <div className="student-footer-hero">
        <div className="student-footer-copy">
          <span className="student-footer-kicker">Student Living</span>
          <h2>Find a place that feels practical on weekdays and peaceful at night.</h2>
          <p>
            Compare locations, shortlist the best rooms, and keep your next move simple.
            Built for students who want clarity before they commit.
          </p>
        </div>

        <div className="student-footer-stats">
          <div>
            <strong>{hostelsCount}</strong>
            <span>Live hostels</span>
          </div>
          <div>
            <strong>{wishlistCount}</strong>
            <span>Saved options</span>
          </div>
          <div>
            <strong>{filteredCount}</strong>
            <span>Matches now</span>
          </div>
        </div>
      </div>

      <div className="student-footer-links">
        <div>
          <h3>Explore</h3>
          <a href="#">Popular localities</a>
          <a href="#">Budget-friendly picks</a>
          <a href="#">High-demand hostels</a>
        </div>
        <div>
          <h3>Support</h3>
          <a href="#">Booking help</a>
          <a href="#">Payment questions</a>
          <a href="#">Safety guidelines</a>
        </div>
        <div>
          <h3>Why this page works</h3>
          <p>Fast filters, cleaner cards, and a tighter layout so the page feels full instead of stretched.</p>
        </div>
        <div className="student-footer-developer">
          <h3>Developer Contact</h3>
          <p>Want a website like this for your hostel or business? Contact {DEVELOPER_NAME}.</p>
          <a href={`tel:${DEVELOPER_PHONE}`}>Call: {DEVELOPER_PHONE}</a>
          <a href={`mailto:${DEVELOPER_EMAIL}`}>Email: {DEVELOPER_EMAIL}</a>
        </div>
      </div>

      <div className="student-footer-bottom">
        <p>All rights reserved @ Machan.</p>
      </div>
    </footer>
  );
}

export default StudentFooter;

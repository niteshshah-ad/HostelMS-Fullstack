function Sidebar({ active, setActive, metrics }) {
  const items = [
    { id: "add", label: "Add Hostel", helper: "Create a new listing" },
    { id: "list", label: "My Hostels", helper: "Review and manage" },
    { id: "bookings", label: "Bookings", helper: "See student requests" },
    { id: "stats", label: "Revenue Stats", helper: "Track occupancy" },
  ];
  const activeItem = items.find((item) => item.id === active) || items[0];
  const occupancyValue = Math.max(0, Math.min(metrics?.occupancyRate || 0, 100));

  return (
    <aside className="warden-sidebar">
      <div className="warden-sidebar-top">
        <div className="warden-sidebar-brand">
          <span className="warden-sidebar-kicker">Warden Workspace</span>
          <h2>Manage hostels with clarity</h2>
          <p>Track inventory, occupancy, and revenue from one clean dashboard.</p>
        </div>

        <div className="warden-sidebar-highlight">
          <span className="warden-sidebar-mini">Daily Focus</span>
          <h3>Keep your best properties full</h3>
          <p>Use quick templates for faster listing, review occupancy often, and update amenities so students can compare with confidence.</p>
          <div className="warden-sidebar-tags">
            <span>Smart listing</span>
            <span>Faster updates</span>
            <span>Clear revenue view</span>
          </div>
        </div>

        <div className="warden-sidebar-story">
          <span className="warden-sidebar-mini">Operations Pulse</span>
          <div className="warden-sidebar-metrics">
            <div>
              <strong>{metrics?.hostelCount ?? 0}</strong>
              <span>Hostels</span>
            </div>
            <div>
              <strong>{occupancyValue}%</strong>
              <span>Occu</span>
            </div>
            <div>
              <strong>{metrics?.bookingCount ?? 0}</strong>
              <span>Bookings</span>
            </div>
          </div>
          <div className="warden-sidebar-story-card">
            <strong>{activeItem.label}</strong>
            <p>{activeItem.helper}. Keep this section fresh so students always see current hostel details and wardens stay one step ahead.</p>
          </div>
          <div className="warden-sidebar-progress">
            <div>
              <span>Occupancy health</span>
              <strong>{occupancyValue >= 75 ? "Strong demand" : occupancyValue >= 45 ? "Stable flow" : "Needs attention"}</strong>
            </div>
            <div className="warden-sidebar-progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(18, occupancyValue)}%` }} />
            </div>
          </div>
          <div className="warden-sidebar-quote">
            <p>
              {metrics?.bookingCount
                ? `${metrics.bookingCount} student booking${metrics.bookingCount === 1 ? "" : "s"} are visible here already. Keep room details fresh, respond faster, and show clean amenities so interest turns into confirmed stays.`
                : "This space tracks your daily hostel momentum. Add sharp photos, keep rent accurate, update amenities regularly, and use the dashboard often so students always see a reliable listing."}
            </p>
          </div>
        </div>
      </div>

      <div className="warden-sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`warden-sidebar-btn ${active === item.id ? "active" : ""}`}
            onClick={() => setActive(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.helper}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import MachanLogo from "../components/MachanLogo";
import ThemeToggle from "../components/ThemeToggle";
import { API_BASE_URL, getStaticAssetUrl } from "../lib/api";
import "../Styles/dashboard.css";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};

const formatApiError = (error, fallbackMessage) => {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return fallbackMessage;
};

const getFacilityList = (hostel) => {
  const facilities = hostel?.facilities || {};
  const enabledFacilities = Object.entries(facilities)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) =>
      key
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );

  const manualFacilities = Array.isArray(hostel?.manual_facilities)
    ? hostel.manual_facilities.filter(Boolean)
    : Array.isArray(hostel?.manualFacilities)
      ? hostel.manualFacilities.filter(Boolean)
      : [];

  return [...new Set([...enabledFacilities, ...manualFacilities])];
};

const getHostelImageSrc = (hostel) => {
  if (typeof hostel?.image === "string" && hostel.image.trim()) {
    return getStaticAssetUrl(hostel.image);
  }

  const firstImage = Array.isArray(hostel?.images) ? hostel.images[0] : "";
  if (typeof firstImage === "string" && firstImage.trim()) {
    return getStaticAssetUrl(firstImage);
  }

  return "";
};

function AdminDashboard() {
  const [hostels, setHostels] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [revenue, setRevenue] = useState({ total_revenue: 0, by_hostel: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [hostelSearch, setHostelSearch] = useState("");
  const [selectedHostel, setSelectedHostel] = useState(null);

  const loadAdminData = async () => {
    setLoading(true);
    setError("");

    try {
      const [hostelsResponse, usersResponse, bookingsResponse, revenueResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/hostels`, getAuthConfig()),
        axios.get(`${API_BASE_URL}/admin/users`, getAuthConfig()),
        axios.get(`${API_BASE_URL}/admin/bookings`, getAuthConfig()),
        axios.get(`${API_BASE_URL}/admin/revenue`, getAuthConfig()),
      ]);

      setHostels(Array.isArray(hostelsResponse.data) ? hostelsResponse.data : []);
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
      setRevenue(revenueResponse.data || { total_revenue: 0, by_hostel: [] });
    } catch (loadError) {
      console.error("Failed to load admin dashboard", loadError);
      setError(formatApiError(loadError, "Admin dashboard data could not be loaded right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleHostelAction = async (hostelName, action) => {
    setActionMessage("");
    setBusyKey(`hostel-${action}-${hostelName}`);

    try {
      const reason =
        action === "deny"
          ? window.prompt("Enter a denial reason for this hostel.")?.trim() || "Needs review from admin."
          : undefined;

      await axios.post(
        `${API_BASE_URL}/admin/hostels/${encodeURIComponent(hostelName)}/${action}`,
        null,
        {
          ...getAuthConfig(),
          params: action === "deny" ? { reason } : undefined,
        }
      );

      setActionMessage(`Hostel "${hostelName}" ${action === "approve" ? "approved" : "denied"} successfully.`);
      await loadAdminData();
    } catch (actionError) {
      console.error(`Failed to ${action} hostel`, actionError);
      setActionMessage(formatApiError(actionError, `Hostel could not be ${action}ed.`));
    } finally {
      setBusyKey("");
    }
  };

  const handleUserAction = async (email, action) => {
    setActionMessage("");
    setBusyKey(`user-${action}-${email}`);

    try {
      await axios.post(
        `${API_BASE_URL}/admin/users/${action}`,
        null,
        {
          ...getAuthConfig(),
          params: { email },
        }
      );

      setActionMessage(`User ${action === "ban" ? "banned" : "unbanned"} successfully.`);
      await loadAdminData();
    } catch (actionError) {
      console.error(`Failed to ${action} user`, actionError);
      setActionMessage(formatApiError(actionError, `User could not be ${action}ned.`));
    } finally {
      setBusyKey("");
    }
  };

  const pendingHostels = useMemo(
    () => hostels.filter((hostel) => (hostel.status || "pending") === "pending"),
    [hostels]
  );

  const deniedHostels = useMemo(
    () => hostels.filter((hostel) => hostel.status === "denied"),
    [hostels]
  );

  const bannedUsers = useMemo(
    () => users.filter((user) => Boolean(user.banned)),
    [users]
  );

  const filteredHostels = useMemo(() => {
    const query = hostelSearch.trim().toLowerCase();
    if (!query) return hostels;

    return hostels.filter((hostel) => {
      const hostelName = (hostel.name || "").toLowerCase();
      const wardenEmail = (hostel.warden_email || hostel.created_by || hostel.owner_id || "").toLowerCase();
      return hostelName.includes(query) || wardenEmail.includes(query);
    });
  }, [hostelSearch, hostels]);

  const statCards = [
    { label: "Total hostels", value: hostels.length },
    { label: "Pending approvals", value: pendingHostels.length },
    { label: "Registered users", value: users.length },
    { label: "Total revenue", value: `Rs ${Math.round(revenue.total_revenue || 0)}` },
  ];

  return (
    <div className="admin-dashboard-page">
      <section className="admin-hero">
        <div className="admin-top-left-tools">
          <MachanLogo compact subtitle="Admin Portal" />
          <ThemeToggle />
        </div>

        <div className="admin-hero-bar">
          <div>
            <p className="admin-kicker">Platform Control Center</p>
            <h1>Admin Dashboard</h1>
            <p className="admin-subcopy">
              Review hostel approvals, watch users, and keep bookings plus revenue in one place.
            </p>
          </div>

          <div className="admin-hero-actions">
            <button className="admin-ghost-btn" type="button" onClick={loadAdminData}>
              Refresh Data
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        <div className="admin-stat-grid">
          {statCards.map((card) => (
            <div className="admin-stat-card" key={card.label}>
              <strong>{card.value}</strong>
              <span>{card.label}</span>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="admin-banner error">{error}</div>}
      {actionMessage && <div className="admin-banner">{actionMessage}</div>}

      {loading ? (
        <div className="admin-empty-state">
          <h3>Loading admin data...</h3>
          <p>Pulling hostels, users, bookings, and revenue from the backend.</p>
        </div>
      ) : (
        <div className="admin-section-stack">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Hostel Approvals</h2>
                <p>Approve good listings fast and block incomplete ones with a reason.</p>
              </div>
              <span className="admin-pill">{pendingHostels.length} pending</span>
            </div>

            <div className="admin-toolbar">
              <input
                className="admin-search-input"
                type="text"
                placeholder="Search by hostel name or warden email"
                value={hostelSearch}
                onChange={(event) => setHostelSearch(event.target.value)}
              />
            </div>

            {filteredHostels.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Preview</th>
                      <th>Hostel</th>
                      <th>Warden</th>
                      <th>City</th>
                      <th>Rooms</th>
                      <th>Availability</th>
                      <th>Facilities</th>
                      <th>Status</th>
                      <th>Rent</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHostels.map((hostel) => {
                      const hostelName = hostel.name || "Untitled Hostel";
                      const facilityList = getFacilityList(hostel);
                      const hostelImage = getHostelImageSrc(hostel);
                      const isApproving = busyKey === `hostel-approve-${hostelName}`;
                      const isDenying = busyKey === `hostel-deny-${hostelName}`;

                      return (
                        <tr key={hostelName}>
                          <td>
                            {hostelImage ? (
                              <button
                                className="admin-image-trigger"
                                type="button"
                                onClick={() => setSelectedHostel(hostel)}
                              >
                                <img className="admin-hostel-thumb" src={hostelImage} alt={hostelName} />
                              </button>
                            ) : (
                              <div className="admin-hostel-thumb admin-hostel-thumb-placeholder">
                                No image
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{hostelName}</strong>
                            <span className="admin-table-subtext">{hostel.location || hostel.address || "No location"}</span>
                            <button
                              className="admin-details-link"
                              type="button"
                              onClick={() => setSelectedHostel(hostel)}
                            >
                              View full details
                            </button>
                          </td>
                          <td>{hostel.warden_email || hostel.created_by || hostel.owner_id || "--"}</td>
                          <td>{hostel.city || "--"}</td>
                          <td>{hostel.total_rooms ?? 0}</td>
                          <td>{hostel.available_rooms ?? 0}</td>
                          <td>
                            {facilityList.length > 0 ? (
                              <div className="admin-facility-list">
                                {facilityList.map((facility) => (
                                  <span className="admin-facility-chip" key={`${hostelName}-${facility}`}>
                                    {facility}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="admin-table-subtext">No facilities added</span>
                            )}
                          </td>
                          <td>
                            <span className={`admin-status-pill ${(hostel.status || "pending").toLowerCase()}`}>
                              {hostel.status || "pending"}
                            </span>
                            {hostel.denied_reason ? (
                              <span className="admin-table-subtext">{hostel.denied_reason}</span>
                            ) : null}
                          </td>
                          <td>{hostel.rent ? `Rs ${hostel.rent}` : "--"}</td>
                          <td>
                            <div className="admin-action-row">
                              <button
                                className="admin-approve-btn"
                                type="button"
                                onClick={() => handleHostelAction(hostelName, "approve")}
                                disabled={isApproving || isDenying}
                              >
                                {isApproving ? "Approving..." : "Approve"}
                              </button>
                              <button
                                className="admin-deny-btn"
                                type="button"
                                onClick={() => handleHostelAction(hostelName, "deny")}
                                disabled={isApproving || isDenying}
                              >
                                {isDenying ? "Denying..." : "Deny"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <h3>{hostels.length > 0 ? "No hostels match your search" : "No hostels found"}</h3>
                <p>
                  {hostels.length > 0
                    ? "Try another hostel name or warden email."
                    : "Hostel approvals will appear here when wardens add listings."}
                </p>
              </div>
            )}
          </section>

          <section className="admin-grid">
            <section className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>User Control</h2>
                  <p>Watch roles and ban or unban accounts when needed.</p>
                </div>
                <span className="admin-pill">{bannedUsers.length} banned</span>
              </div>

              {users.length > 0 ? (
                <div className="admin-list">
                  {users.map((user) => {
                    const email = user.email || "unknown@user";
                    const isBanning = busyKey === `user-ban-${email}`;
                    const isUnbanning = busyKey === `user-unban-${email}`;

                    return (
                      <div className="admin-list-card" key={email}>
                        <div>
                          <strong>{user.name || "Unnamed User"}</strong>
                          <p>{email}</p>
                          <span className="admin-inline-meta">
                            Role: {user.role || "student"} {user.banned ? "• Banned" : "• Active"}
                          </span>
                        </div>
                        <button
                          className={user.banned ? "admin-unban-btn" : "admin-ban-btn"}
                          type="button"
                          onClick={() => handleUserAction(email, user.banned ? "unban" : "ban")}
                          disabled={isBanning || isUnbanning}
                        >
                          {isBanning ? "Banning..." : isUnbanning ? "Unbanning..." : user.banned ? "Unban" : "Ban"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="admin-empty-state compact">
                  <h3>No users found</h3>
                </div>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>Revenue Summary</h2>
                  <p>Track total revenue and compare hostel performance quickly.</p>
                </div>
                <span className="admin-pill">Rs {Math.round(revenue.total_revenue || 0)}</span>
              </div>

              {revenue.by_hostel?.length > 0 ? (
                <div className="admin-list">
                  {revenue.by_hostel.map((item) => (
                    <div className="admin-list-card" key={item.hostel || "unknown-hostel"}>
                      <div>
                        <strong>{item.hostel || "Unknown hostel"}</strong>
                        <p>{item.count || 0} bookings</p>
                      </div>
                      <span className="admin-revenue-value">Rs {Math.round(item.revenue || 0)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="admin-empty-state compact">
                  <h3>No revenue data yet</h3>
                </div>
              )}
            </section>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Booking Activity</h2>
                <p>See a top-level stream of bookings created across the platform.</p>
              </div>
              <span className="admin-pill">{bookings.length} bookings</span>
            </div>

            {bookings.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Hostel</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Room</th>
                      <th>Booked At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id || `${booking.hostel_name}-${booking.user_email}`}>
                        <td>{booking.hostel_name || "--"}</td>
                        <td>{booking.user_name || "--"}</td>
                        <td>{booking.user_email || "--"}</td>
                        <td>{booking.room_number ?? "--"}</td>
                        <td>{booking.booked_at ? new Date(booking.booked_at).toLocaleString("en-IN") : "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty-state">
                <h3>No bookings found</h3>
                <p>Bookings will appear here after students confirm payments and reserve rooms.</p>
              </div>
            )}
          </section>

          {deniedHostels.length > 0 ? (
            <section className="admin-panel">
              <div className="admin-panel-head">
                <div>
                  <h2>Recently Denied Hostels</h2>
                  <p>Quickly revisit hostels that still need admin attention.</p>
                </div>
                <span className="admin-pill">{deniedHostels.length} denied</span>
              </div>

              <div className="admin-list">
                {deniedHostels.map((hostel) => (
                  <div className="admin-list-card" key={`denied-${hostel.name}`}>
                    <div>
                      <strong>{hostel.name}</strong>
                      <p>{hostel.city || hostel.location || "Unknown location"}</p>
                      <span className="admin-inline-meta">{hostel.denied_reason || "No reason added"}</span>
                    </div>
                    <button
                      className="admin-approve-btn"
                      type="button"
                      onClick={() => handleHostelAction(hostel.name, "approve")}
                      disabled={busyKey === `hostel-approve-${hostel.name}`}
                    >
                      Re-approve
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {selectedHostel ? (
        <div className="admin-modal-backdrop" onClick={() => setSelectedHostel(null)} role="presentation">
          <div
            className="admin-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Hostel details"
          >
            <div className="admin-modal-head">
              <div>
                <p className="admin-kicker">Hostel Details</p>
                <h2>{selectedHostel.name || "Untitled Hostel"}</h2>
              </div>
              <button className="admin-modal-close" type="button" onClick={() => setSelectedHostel(null)}>
                Close
              </button>
            </div>

            <div className="admin-modal-grid">
              <div className="admin-modal-media">
                {getHostelImageSrc(selectedHostel) ? (
                  <img
                    className="admin-modal-image"
                    src={getHostelImageSrc(selectedHostel)}
                    alt={selectedHostel.name || "Hostel"}
                  />
                ) : (
                  <div className="admin-modal-image admin-hostel-thumb-placeholder">No image available</div>
                )}
              </div>

              <div className="admin-modal-info">
                <div className="admin-detail-card">
                  <strong>Warden Login Email</strong>
                  <span>{selectedHostel.warden_email || selectedHostel.created_by || selectedHostel.owner_id || "--"}</span>
                </div>
                <div className="admin-detail-card">
                  <strong>Address</strong>
                  <span>{selectedHostel.address || "--"}</span>
                </div>
                <div className="admin-detail-card">
                  <strong>Location</strong>
                  <span>{selectedHostel.location || "--"}, {selectedHostel.city || "--"}</span>
                </div>
                <div className="admin-detail-card">
                  <strong>Rooms</strong>
                  <span>{selectedHostel.total_rooms ?? 0} total • {selectedHostel.available_rooms ?? 0} available</span>
                </div>
                <div className="admin-detail-card">
                  <strong>Rent</strong>
                  <span>{selectedHostel.rent ? `Rs ${selectedHostel.rent}` : "--"}</span>
                </div>
                <div className="admin-detail-card">
                  <strong>Status</strong>
                  <span>{selectedHostel.status || "pending"}</span>
                </div>
              </div>
            </div>

            <div className="admin-detail-section">
              <strong>Facilities</strong>
              <div className="admin-facility-list">
                {getFacilityList(selectedHostel).length > 0 ? (
                  getFacilityList(selectedHostel).map((facility) => (
                    <span className="admin-facility-chip" key={`modal-${facility}`}>
                      {facility}
                    </span>
                  ))
                ) : (
                  <span className="admin-table-subtext">No facilities added</span>
                )}
              </div>
            </div>

            {selectedHostel.denied_reason ? (
              <div className="admin-detail-section">
                <strong>Denied Reason</strong>
                <p>{selectedHostel.denied_reason}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboard;

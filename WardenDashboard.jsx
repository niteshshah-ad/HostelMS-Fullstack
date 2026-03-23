import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import MachanLogo from "../components/MachanLogo";
import ThemeToggle from "../components/ThemeToggle";
import Sidebar from "../components/Sidebar";
import HostelTable from "../components/HostelTable";
import { API_BASE_URL, getStaticAssetUrl } from "../lib/api";
import "../Styles/wardendashboard.css";

const initialForm = {
  name: "",
  location: "",
  city: "",
  rent: "",
  total_rooms: "",
  available_rooms: "",
  category: "Standard",
  facilities: {
    wifi: false,
    ac: false,
    ro: false,
    cooler: false,
    food: false,
    breakfast: false,
    lunch: false,
    dinner: false,
    cleanliness: false,
    private_bathroom: false,
    common_bathroom: false,
    shower: false,
    chair: false,
    desk: false,
    electric_kettle: false,
    attached_bathroom: false,
    free_parking: false,
  },
  image: null,
  imagePreview: "",
};

const facilityOptions = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "ac", label: "AC" },
  { key: "ro", label: "RO Filter" },
  { key: "cooler", label: "Cooler" },
  { key: "food", label: "Mess / Food" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "private_bathroom", label: "Private Bathroom" },
  { key: "common_bathroom", label: "Common Bathroom" },
  { key: "shower", label: "Shower" },
  { key: "chair", label: "Chair" },
  { key: "desk", label: "Desk" },
  { key: "electric_kettle", label: "Electric Kettle" },
  { key: "attached_bathroom", label: "Attached Bathroom" },
  { key: "free_parking", label: "Free Parking" },
];

const quickTemplates = [
  {
    name: "Sunrise Girls Hostel",
    location: "College Road",
    city: "Jaipur",
    rent: 6500,
    total_rooms: 40,
    available_rooms: 8,
    category: "Girls Hostel",
    imagePreview: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "North Block Boys Residency",
    location: "Civil Lines",
    city: "Indore",
    rent: 5200,
    total_rooms: 32,
    available_rooms: 5,
    category: "Boys Hostel",
    imagePreview: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Urban Nest Premium PG",
    location: "Metro Station",
    city: "Ahmedabad",
    rent: 8900,
    total_rooms: 28,
    available_rooms: 10,
    category: "Premium PG",
    imagePreview: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Lakeview Student House",
    location: "University Circle",
    city: "Bhopal",
    rent: 7200,
    total_rooms: 36,
    available_rooms: 7,
    category: "Standard",
    imagePreview: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
  },
];

const INSTAGRAM_URL = "https://www.instagram.com/invites/contact/?utm_source=ig_contact_invite&utm_medium=copy_link&utm_content=pic74e3";
const FACEBOOK_URL = "https://www.facebook.com/share/1AUpNEuzU7/";
const LINKEDIN_URL = "https://www.linkedin.com/in/nitesh-gupta219";
const DEVELOPER_NAME = "Nitesh";
const DEVELOPER_PHONE = "9555347017";
const DEVELOPER_EMAIL = "niteshkumargupta219@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveImageSrc = (imageValue) => {
  if (!imageValue || typeof imageValue !== "string") return "";
  if (imageValue.startsWith("http") || imageValue.startsWith("blob:") || imageValue.startsWith("data:")) {
    return imageValue;
  }

  return getStaticAssetUrl(imageValue);
};

const createEmptyForm = () => ({
  ...initialForm,
  facilities: { ...initialForm.facilities },
});

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

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.msg) return item.msg;
        return null;
      })
      .filter(Boolean)
      .join(", ");
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

const normalizeHostel = (hostel) => {
  const rent = Number(hostel.rent ?? hostel.price ?? hostel.rent_min ?? 0);
  const totalRooms = Number(hostel.total_rooms ?? hostel.totalRooms ?? 0);
  const availableRooms = Number(hostel.available_rooms ?? hostel.availableRooms ?? 0);
  const occupiedRooms = Math.max(totalRooms - availableRooms, 0);

  return {
    ...hostel,
    rent,
    total_rooms: totalRooms,
    available_rooms: availableRooms,
    facilities: {
      ...initialForm.facilities,
      ...(hostel.facilities || {}),
    },
    manualFacilities: hostel.manualFacilities || hostel.manual_facilities || [],
    imagePreview: resolveImageSrc(hostel.imagePreview) || resolveImageSrc(hostel.image),
    revenue: hostel.revenue ?? rent * occupiedRooms,
  };
};

const buildHostelApiParams = (hostelData) => ({
  name: hostelData.name,
  address: hostelData.address || `${hostelData.location}, ${hostelData.city}`,
  total_rooms: hostelData.total_rooms,
  available_rooms: hostelData.available_rooms,
  rent: hostelData.rent,
  location: hostelData.location,
  city: hostelData.city,
  mess: Boolean(hostelData.facilities?.food),
  ac: Boolean(hostelData.facilities?.ac),
  cooler: Boolean(hostelData.facilities?.cooler),
  wifi: Boolean(hostelData.facilities?.wifi),
  ro: Boolean(hostelData.facilities?.ro),
  food: Boolean(hostelData.facilities?.food),
  facilities_json: JSON.stringify(hostelData.facilities || {}),
  manual_facilities_json: JSON.stringify(hostelData.manualFacilities || []),
});

function SocialIcon({ type }) {
  const icons = {
    instagram: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.2" />
        <circle cx="17.2" cy="6.8" r="1.1" />
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 21v-7h2.5l.5-3h-3v-1.8c0-1 .4-1.7 1.9-1.7H17V4.8c-.5-.1-1.5-.2-2.6-.2-2.6 0-4.4 1.6-4.4 4.6V11H7.5v3H10v7h3.5Z" />
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.9 7.2c.8-.1 1.5-.5 2.1-1-.3.8-.9 1.4-1.6 1.8v.4c0 4.2-3.2 9.1-9.1 9.1-1.8 0-3.5-.5-4.9-1.4h.8c1.5 0 2.9-.5 4-1.4-1.4 0-2.6-1-3-2.2h.6c.3 0 .6 0 .8-.1-1.5-.3-2.6-1.7-2.6-3.3.4.2.9.4 1.4.4-.9-.6-1.5-1.6-1.5-2.8 0-.6.2-1.2.5-1.7 1.6 2 4 3.3 6.7 3.4-.1-.2-.1-.5-.1-.8 0-1.9 1.5-3.4 3.4-3.4 1 0 1.9.4 2.5 1.1Z" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.2 8.4A1.9 1.9 0 1 1 6.2 4.6a1.9 1.9 0 0 1 0 3.8ZM4.8 9.8h2.8V19H4.8V9.8Zm4.8 0h2.7v1.3h.1c.4-.7 1.3-1.6 2.8-1.6 3 0 3.6 2 3.6 4.6V19H16v-4.2c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V19H9.6V9.8Z" />
      </svg>
    ),
  };

  return icons[type] || null;
}

function WardenDashboard() {
  const [active, setActive] = useState("add");
  const [hostels, setHostels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [wellnessOverview, setWellnessOverview] = useState(null);
  const [wardenEmail, setWardenEmail] = useState("");
  const [entryMode, setEntryMode] = useState("quick");
  const [form, setForm] = useState(createEmptyForm);
  const [editingHostelName, setEditingHostelName] = useState("");
  const [showFacilities, setShowFacilities] = useState(false);
  const [customFacility, setCustomFacility] = useState("");
  const [manualFacilities, setManualFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterMessage, setNewsletterMessage] = useState({ type: "", text: "" });
  const addSectionRef = useRef(null);
  const listSectionRef = useRef(null);
  const bookingsSectionRef = useRef(null);
  const statsSectionRef = useRef(null);
  const wellnessSectionRef = useRef(null);

  const loadHostels = async () => {
    setLoading(true);

    try {
      const [profileResponse, hostelsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/auth/profile`, getAuthConfig()),
        axios.get(`${API_BASE_URL}/hostels`, getAuthConfig()),
      ]);

      const currentWardenEmail = profileResponse.data?.email || "";
      setWardenEmail(currentWardenEmail);

      const nextHostels = Array.isArray(hostelsResponse.data)
        ? hostelsResponse.data
            .filter((hostel) => {
              if (!currentWardenEmail) return false;

              return (
                hostel.warden_email === currentWardenEmail ||
                hostel.owner_id === currentWardenEmail ||
                hostel.created_by === currentWardenEmail
              );
            })
            .map(normalizeHostel)
        : [];

      setHostels(nextHostels);
    } catch (error) {
      console.error("Failed to load hostels", error);
      setSubmitError(formatApiError(error, "We couldn't load your saved hostels from the server."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHostels();
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings`, getAuthConfig());
      const nextBookings = Array.isArray(response.data)
        ? response.data.filter((booking) => !wardenEmail || hostels.some((hostel) => hostel.name === booking.hostel_name))
        : [];
      setBookings(nextBookings);
    } catch (error) {
      console.error("Failed to load bookings", error);
    }
  }, [hostels, wardenEmail]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const loadWellnessOverview = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/wellness/summary`, getAuthConfig());
        setWellnessOverview(response.data);
      } catch (error) {
        console.error("Failed to load wellness summary", error);
      }
    };

    loadWellnessOverview();
  }, []);

  const handleNewsletterJoin = () => {
    const trimmedEmail = newsletterEmail.trim();

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setNewsletterMessage({
        type: "error",
        text: "Enter a valid email address before joining the monthly update.",
      });
      return;
    }

    const subject = encodeURIComponent("Monthly Update Join Request");
    const body = encodeURIComponent(
      `Hi ${DEVELOPER_NAME},\n\nPlease add this email to the monthly update list:\n${trimmedEmail}\n`
    );
    window.open(`mailto:${DEVELOPER_EMAIL}?subject=${subject}&body=${body}`, "_blank");

    setNewsletterMessage({
      type: "success",
      text: "Thanks. Your email app is opening so you can send the join request.",
    });
    setNewsletterEmail("");
  };

  useEffect(() => {
    if (active === "bookings") {
      loadBookings();
    }
  }, [active, loadBookings]);

  const scrollToWellness = () => {
    wellnessSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const sectionRefs = {
      add: addSectionRef,
      list: listSectionRef,
      bookings: bookingsSectionRef,
      stats: statsSectionRef,
    };

    const targetRef = sectionRefs[active];
    if (!targetRef?.current) return;

    requestAnimationFrame(() => {
      targetRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [active]);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;

    if (name === "image") {
      const file = files?.[0] || null;
      setForm((prev) => ({
        ...prev,
        image: file,
        imagePreview: file ? URL.createObjectURL(file) : "",
      }));
      return;
    }

    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        facilities: {
          ...prev.facilities,
          [name]: checked,
        },
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const buildHostelRecord = (data) => {
    const rent = Number(data.rent);
    const totalRooms = Number(data.total_rooms);
    const availableRooms = Number(data.available_rooms);
    const occupiedRooms = totalRooms - availableRooms;
    const revenue = rent * occupiedRooms;

    return {
      ...data,
      rent,
      total_rooms: totalRooms,
      available_rooms: availableRooms,
      manualFacilities,
      revenue,
    };
  };

  const resetFormState = () => {
    setForm(createEmptyForm());
    setEditingHostelName("");
    setShowFacilities(false);
    setCustomFacility("");
    setManualFacilities([]);
  };

  const saveHostel = async (hostelData) => {
    const authConfig = getAuthConfig();
    const params = buildHostelApiParams(hostelData);
    const requestPath = editingHostelName
      ? `${API_BASE_URL}/hostels/${encodeURIComponent(editingHostelName)}`
      : `${API_BASE_URL}/hostels`;
    const requestMethod = editingHostelName ? "put" : "post";

    if (hostelData.image instanceof File) {
      const formData = new FormData();
      formData.append("files", hostelData.image);

      await axios({
        method: requestMethod,
        url: requestPath,
        data: formData,
        ...authConfig,
        params,
        headers: {
          ...authConfig.headers,
          "Content-Type": "multipart/form-data",
        },
      });
    } else {
      await axios({
        method: requestMethod,
        url: requestPath,
        data: null,
        ...authConfig,
        params,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (Number(form.available_rooms) > Number(form.total_rooms)) {
      setSubmitError("Available rooms cannot be more than total rooms.");
      return;
    }

    setIsSaving(true);

    try {
      await saveHostel(buildHostelRecord(form));
      await loadHostels();
      resetFormState();
      setActive("list");
    } catch (error) {
      console.error("Failed to save hostel", error);
      setSubmitError(formatApiError(error, "Hostel could not be saved to the database."));
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (template) => {
    setEntryMode("quick");
    setForm({
      ...createEmptyForm(),
      ...template,
      image: null,
    });
    setManualFacilities([]);
  };

  const addTemplateDirectly = async (template) => {
    setSubmitError("");
    setIsSaving(true);

    try {
      await saveHostel(buildHostelRecord(template));
      await loadHostels();
      setActive("list");
    } catch (error) {
      console.error("Failed to save hostel template", error);
      setSubmitError(formatApiError(error, "Template hostel could not be saved."));
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateLastHostel = () => {
    if (hostels.length === 0) return;

    const lastHostel = hostels[0];
    setForm({
      ...createEmptyForm(),
      ...lastHostel,
      name: `${lastHostel.name} Copy`,
      image: null,
    });
    setEntryMode("manual");
    setShowFacilities(false);
    setManualFacilities(lastHostel.manualFacilities || []);
    setActive("add");
  };

  const handleEdit = (hostel) => {
    if (!hostel?.name) return;

    setEditingHostelName(hostel.name);
    setEntryMode("manual");
    setForm({
      ...createEmptyForm(),
      ...hostel,
      facilities: {
        ...initialForm.facilities,
        ...(hostel.facilities || {}),
      },
      image: null,
      imagePreview: hostel.imagePreview || resolveImageSrc(hostel.image),
    });
    setShowFacilities(false);
    setCustomFacility("");
    setManualFacilities(hostel.manualFacilities || hostel.manual_facilities || []);
    setActive("add");
  };

  const selectedFacilities = facilityOptions
    .filter((facility) => form.facilities[facility.key])
    .map((facility) => facility.label);

  const addCustomFacility = () => {
    const trimmed = customFacility.trim();
    if (!trimmed) return;
    if (manualFacilities.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;
    setManualFacilities((prev) => [...prev, trimmed]);
    setCustomFacility("");
  };

  const removeCustomFacility = (facilityName) => {
    setManualFacilities((prev) => prev.filter((item) => item !== facilityName));
  };

  const handleDelete = async (hostel) => {
    if (!hostel?.name) return;

    setSubmitError("");
    setIsDeleting(true);

    try {
      await axios.delete(`${API_BASE_URL}/hostels/${encodeURIComponent(hostel.name)}`, getAuthConfig());
      await loadHostels();
    } catch (error) {
      console.error("Failed to delete hostel", error);
      setSubmitError(formatApiError(error, "Hostel could not be removed from the database."));
    } finally {
      setIsDeleting(false);
    }
  };

  const totalRevenue = hostels.reduce((acc, h) => acc + Number(h.revenue), 0);
  const totalRooms = hostels.reduce((acc, h) => acc + Number(h.total_rooms), 0);
  const availableRooms = hostels.reduce((acc, h) => acc + Number(h.available_rooms), 0);
  const occupiedRooms = totalRooms - availableRooms;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const averageRent = hostels.length > 0
    ? Math.round(hostels.reduce((acc, h) => acc + Number(h.rent), 0) / hostels.length)
    : 0;

  const statCards = useMemo(() => ([
    { label: "Managed hostels", value: hostels.length, tone: "warm" },
    { label: "Occupancy rate", value: `${occupancyRate}%`, tone: "green" },
    { label: "Avg. monthly rent", value: averageRent ? `₹${averageRent}` : "--", tone: "soft" },
  ]), [hostels.length, occupancyRate, averageRent]);

  return (
    <div className="warden-dashboard">
      <Sidebar
        active={active}
        setActive={setActive}
        metrics={{
          hostelCount: hostels.length,
          occupancyRate,
          bookingCount: bookings.length,
        }}
      />

      <div className="warden-main">
        <section className="warden-hero">
          <div className="warden-hero-actions">
            <ThemeToggle />
            <button className="warden-hero-nav-btn" type="button" onClick={() => { window.location.href = "/student-dashboard"; }}>
              Home
            </button>
            <button className="warden-hero-nav-btn" type="button" onClick={scrollToWellness}>
              Wellness
            </button>
            <button className="warden-hero-nav-btn" type="button" onClick={() => setActive("add")}>
              Add Hostel
            </button>
            <button className="warden-hero-nav-btn" type="button" onClick={() => setActive("list")}>
              My Hostels
            </button>
            <button className="warden-hero-nav-btn" type="button" onClick={() => setActive("bookings")}>
              Bookings
            </button>
            <button className="warden-hero-nav-btn" type="button" onClick={() => setActive("stats")}>
              Revenue
            </button>
            <button className="warden-hero-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>

          <div className="warden-hero-copy">
            <div className="warden-hero-brand-row">
              <MachanLogo compact subtitle="Warden Portal" />
            </div>
            <p className="warden-eyebrow">Warden Dashboard</p>
            <h1>Run your hostel operations without the clutter.</h1>
            <p className="warden-subcopy">
              Add listings faster, monitor occupancy, and keep your revenue snapshot visible
              at all times.
            </p>
          </div>

          <div className="warden-stat-grid">
            {statCards.map((card) => (
              <div className={`warden-stat-card ${card.tone}`} key={card.label}>
                <strong>{card.value}</strong>
                <span>{card.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="warden-panel warden-wellness-panel" ref={wellnessSectionRef}>
          <div className="warden-panel-head">
            <div>
              <p className="warden-section-kicker">Wellness Overview</p>
              <h2>Anonymous student wellbeing and green habits</h2>
            </div>
            <span className="warden-form-pill">Opt-in only</span>
          </div>

          {wellnessOverview ? (
            <>
              <div className="warden-wellness-grid">
                <div className="warden-wellness-card">
                  <strong>{wellnessOverview.students_tracked ?? 0}</strong>
                  <span>Students tracked</span>
                </div>
                <div className="warden-wellness-card">
                  <strong>{wellnessOverview.average_wellness_score ?? "--"}</strong>
                  <span>Avg. wellness score</span>
                </div>
                <div className="warden-wellness-card">
                  <strong>{wellnessOverview.average_eco_score ?? "--"}</strong>
                  <span>Avg. eco score</span>
                </div>
                <div className="warden-wellness-card">
                  <strong>{wellnessOverview.high_support_need ?? 0}</strong>
                  <span>High support need</span>
                </div>
              </div>

              <div className="warden-wellness-tips">
                <h3>Latest support signals</h3>
                {wellnessOverview.latest_tips?.length > 0 ? (
                  wellnessOverview.latest_tips.map((tip) => <p key={tip}>{tip}</p>)
                ) : (
                  <p>No wellness check-ins yet from students in your managed hostels.</p>
                )}
              </div>
            </>
          ) : (
            <div className="warden-empty-panel">
              <h3>No wellness data yet</h3>
              <p>Once students start opt-in daily check-ins, anonymous wellbeing and eco trends will appear here.</p>
            </div>
          )}
        </section>

        {active === "add" && (
          <div className="warden-add-layout" ref={addSectionRef}>
            <section className="warden-panel">
              <div className="warden-panel-head">
                <div>
                  <p className="warden-section-kicker">Add Options</p>
                  <h2>Create a listing your way</h2>
                </div>
                <div className="warden-mode-switch">
                  <button
                    className={entryMode === "manual" ? "active" : ""}
                    onClick={() => setEntryMode("manual")}
                    type="button"
                  >
                    Manual Entry
                  </button>
                  <button
                    className={entryMode === "quick" ? "active" : ""}
                    onClick={() => setEntryMode("quick")}
                    type="button"
                  >
                    Quick Start
                  </button>
                </div>
              </div>

              <div className="warden-option-grid">
                <button className="warden-option-card" type="button" onClick={() => setEntryMode("manual")}>
                  <strong>Manual form</strong>
                  <span>Fill all hostel details from scratch with full control.</span>
                </button>
                <button className="warden-option-card" type="button" onClick={() => setEntryMode("quick")}>
                  <strong>Use template</strong>
                  <span>Start from a ready hostel type and edit only what changes.</span>
                </button>
                <button
                  className="warden-option-card"
                  type="button"
                  onClick={duplicateLastHostel}
                  disabled={hostels.length === 0}
                >
                  <strong>Duplicate last hostel</strong>
                  <span>Reuse your previous entry to save time on similar properties.</span>
                </button>
              </div>

              <div className="warden-template-grid">
                {quickTemplates.map((template) => (
                  <article className="warden-template-card" key={template.name}>
                    <img src={template.imagePreview} alt={template.name} />
                    <div>
                      <span>{template.category}</span>
                      <h3>{template.name}</h3>
                      <p>{template.city} • {template.location}</p>
                    </div>
                    <div className="warden-template-actions">
                      <button type="button" onClick={() => applyTemplate(template)}>
                        Load Template
                      </button>
                      <button type="button" onClick={() => addTemplateDirectly(template)}>
                        Add Instantly
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {submitError && <p>{submitError}</p>}
            </section>

            <form className="warden-form-card" onSubmit={handleSubmit}>
              <div className="warden-panel-head">
                <div>
                  <p className="warden-section-kicker">Listing Form</p>
                  <h2>{editingHostelName ? "Edit Hostel" : "Add Hostel"}</h2>
                </div>
                <span className="warden-form-pill">
                  {editingHostelName ? "Edit mode" : (form.category || "Standard")}
                </span>
              </div>

              {editingHostelName && (
                <div className="warden-edit-banner">
                  <div>
                    <strong>Editing {editingHostelName}</strong>
                    <span>Update rent, hostel name, image, or other listing details here.</span>
                  </div>
                  <button type="button" className="warden-edit-cancel-btn" onClick={resetFormState}>
                    Cancel
                  </button>
                </div>
              )}

              <div className="warden-form-grid">
                <label className="warden-field">
                  <span>Hostel Name</span>
                  <input name="name" placeholder="Hostel Name" value={form.name} onChange={handleChange} required />
                </label>

                <label className="warden-field warden-select-field">
                  <span>Category</span>
                  <select className="warden-category-select" name="category" value={form.category} onChange={handleChange}>
                    <option value="Standard">Standard</option>
                    <option value="Boys Hostel">Boys Hostel</option>
                    <option value="Girls Hostel">Girls Hostel</option>
                    <option value="Premium PG">Premium PG</option>
                  </select>
                </label>

                <label className="warden-field">
                  <span>Location</span>
                  <input name="location" placeholder="Area / landmark" value={form.location} onChange={handleChange} required />
                </label>

                <label className="warden-field">
                  <span>City</span>
                  <input name="city" placeholder="City" value={form.city} onChange={handleChange} required />
                </label>

                <label className="warden-field">
                  <span>Monthly Rent</span>
                  <input type="number" inputMode="numeric" name="rent" placeholder="Rent" value={form.rent} onChange={handleChange} required />
                </label>

                <label className="warden-field">
                  <span>Total Rooms</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    name="total_rooms"
                    placeholder="Total Rooms"
                    value={form.total_rooms}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="warden-field">
                  <span>Available Rooms</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    name="available_rooms"
                    placeholder="Available Rooms"
                    value={form.available_rooms}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label className="warden-field warden-upload-field">
                  <span>Image Upload</span>
                  <input className="warden-file-input" type="file" name="image" onChange={handleChange} />
                  <small>{form.image ? form.image.name : "Choose a hostel cover image"}</small>
                </label>
              </div>

              <div className="warden-facility-panel">
                <div className="warden-facility-head">
                  <span>Facilities</span>
                  <small>Select the amenities available in this hostel</small>
                </div>

                <button
                  type="button"
                  className={`warden-facility-toggle ${showFacilities ? "open" : ""}`}
                  onClick={() => setShowFacilities((prev) => !prev)}
                >
                  <span>
                    {[...selectedFacilities, ...manualFacilities].length > 0
                      ? [...selectedFacilities, ...manualFacilities].join(", ")
                      : "Choose facilities"}
                  </span>
                </button>

                {showFacilities && (
                  <div className="warden-facility-dropdown">
                    {facilityOptions.map((facility) => (
                      <label className="warden-facility-option" key={facility.key}>
                        <input
                          type="checkbox"
                          name={facility.key}
                          checked={form.facilities[facility.key]}
                          onChange={handleChange}
                        />
                        <span>{facility.label}</span>
                      </label>
                    ))}

                    <div className="warden-custom-facility">
                      <input
                        type="text"
                        placeholder="Add custom facility"
                        value={customFacility}
                        onChange={(e) => setCustomFacility(e.target.value)}
                      />
                      <button type="button" onClick={addCustomFacility}>
                        Add
                      </button>
                    </div>

                    {manualFacilities.length > 0 && (
                      <div className="warden-custom-facility-list">
                        {manualFacilities.map((facility) => (
                          <button
                            className="warden-custom-chip"
                            key={facility}
                            type="button"
                            onClick={() => removeCustomFacility(facility)}
                          >
                            {facility} x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="warden-form-footer">
                <div className="warden-form-summary">
                  <span>Projected revenue</span>
                  <strong>
                    ₹
                    {form.rent && form.total_rooms && form.available_rooms
                      ? Number(form.rent) * (Number(form.total_rooms) - Number(form.available_rooms))
                      : 0}
                  </strong>
                </div>
                <button type="submit" className="warden-submit-btn" disabled={isSaving}>
                  {isSaving ? (editingHostelName ? "Updating..." : "Saving...") : (editingHostelName ? "Update Hostel" : "Save Hostel")}
                </button>
              </div>
            </form>
          </div>
        )}

        {active === "list" && (
          <section className="warden-panel" ref={listSectionRef}>
            <div className="warden-panel-head">
              <div>
                <p className="warden-section-kicker">Portfolio</p>
                <h2>My Hostels</h2>
              </div>
              <span className="warden-form-pill">{hostels.length} total</span>
            </div>
            {submitError && <p>{submitError}</p>}
            {loading ? (
              <p>Loading saved hostels...</p>
            ) : (
              <HostelTable
                hostels={hostels}
                handleDelete={handleDelete}
                handleEdit={handleEdit}
                isDeleting={isDeleting}
              />
            )}
          </section>
        )}

        {active === "stats" && (
          <section className="warden-stats-layout" ref={statsSectionRef}>
            <div className="warden-panel warden-stats-panel">
              <p className="warden-section-kicker">Revenue Overview</p>
              <h2>Performance snapshot</h2>

              <div className="warden-stats-grid">
                <div className="warden-big-stat">
                  <span>Total revenue</span>
                  <strong>₹{totalRevenue}</strong>
                </div>
                <div className="warden-small-stat">
                  <span>Total rooms</span>
                  <strong>{totalRooms}</strong>
                </div>
                <div className="warden-small-stat">
                  <span>Occupied rooms</span>
                  <strong>{occupiedRooms}</strong>
                </div>
                <div className="warden-small-stat">
                  <span>Available rooms</span>
                  <strong>{availableRooms}</strong>
                </div>
              </div>
            </div>

            <div className="warden-panel warden-insight-panel">
              <p className="warden-section-kicker">Insights</p>
              <h2>Quick notes</h2>
              <ul className="warden-insight-list">
                <li>{hostels.length > 0 ? `${hostels.length} hostels are currently tracked in your dashboard.` : "Start by adding your first hostel listing."}</li>
                <li>{occupancyRate}% occupancy gives you a quick view of how full your properties are.</li>
                <li>{averageRent ? `Average rent is ₹${averageRent} per hostel.` : "Average rent will appear after you add listings."}</li>
              </ul>
            </div>
          </section>
        )}

        {active === "bookings" && (
          <section className="warden-panel" ref={bookingsSectionRef}>
            <div className="warden-panel-head">
              <div>
                <p className="warden-section-kicker">Reservations</p>
                <h2>Bookings for my hostels</h2>
              </div>
              <span className="warden-form-pill">{bookings.length} total</span>
            </div>

            {bookings.length > 0 ? (
              <div className="warden-table-shell">
                <table className="warden-hostel-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Hostel</th>
                      <th>Room</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>ID Proof</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id}>
                        <td>
                          <div className="warden-booking-student">
                            <strong>{booking.student_name}</strong>
                            <div className="warden-booking-student-meta">
                              <span><b>Email:</b> {booking.student_email}</span>
                              <span><b>Phone:</b> {booking.phone_number}</span>
                              <span><b>Aadhaar:</b> {booking.aadhaar_id}</span>
                              <span><b>Gender:</b> {booking.gender}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <strong>{booking.hostel_name}</strong>
                        </td>
                        <td>{booking.room_type}{booking.room_number ? ` • #${booking.room_number}` : ""}</td>
                        <td>
                          <strong>₹{booking.booking_amount || 0}</strong>
                          <span>{booking.payment_id || "Payment pending"}</span>
                        </td>
                        <td>{booking.status}</td>
                        <td>
                          {booking.id_proof_image ? (
                            <a
                              href={`${API_BASE_URL}/static/uploads/${booking.id_proof_image}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View ID
                            </a>
                          ) : (
                            "--"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="warden-empty-panel">
                <h3>No bookings yet</h3>
                <p>Student bookings for your hostels will appear here after successful payment.</p>
              </div>
            )}
          </section>
        )}

        <footer className="warden-footer">
          <div className="warden-footer-hero">
            <div className="warden-footer-copy">
              <span className="warden-footer-kicker">Stay Connected</span>
              <h2>Build a hostel brand students actually remember.</h2>
              <p>
                Showcase better spaces, keep listings fresh, and stay active across the
                channels students already use before they book.
              </p>
              <div className="warden-footer-socials">
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="warden-social-btn"
                >
                  <SocialIcon type="instagram" />
                </a>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="warden-social-btn"
                >
                  <SocialIcon type="facebook" />
                </a>
                <a href="#" aria-label="Twitter" className="warden-social-btn">
                  <SocialIcon type="twitter" />
                </a>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="warden-social-btn"
                >
                  <SocialIcon type="linkedin" />
                </a>
              </div>
            </div>

            <div className="warden-footer-gallery">
              <article className="warden-footer-card large">
                <img
                  src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80"
                  alt="Modern hostel room"
                />
                <div>
                  <span>Featured Spaces</span>
                  <strong>Design rooms that sell faster</strong>
                </div>
              </article>
              <article className="warden-footer-card">
                <img
                  src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80"
                  alt="Shared hostel interior"
                />
                <div>
                  <span>Comfort First</span>
                  <strong>Clean, bright, student-ready</strong>
                </div>
              </article>
              <article className="warden-footer-card">
                <img
                  src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"
                  alt="Hostel common area"
                />
                <div>
                  <span>Community Feel</span>
                  <strong>Spaces where students settle in</strong>
                </div>
              </article>
            </div>
          </div>

          <div className="warden-footer-links">
            <div>
              <h3>Platform</h3>
              <a href="#">Listing Management</a>
              <a href="#">Revenue Tracking</a>
              <a href="#">Occupancy Insights</a>
            </div>
            <div>
              <h3>Support</h3>
              <a href="#">Help Center</a>
              <a href="#">Contact Team</a>
              <a href="#">Guides</a>
            </div>
            <div>
              <h3>Explore</h3>
              <a href="#">Student Dashboard</a>
              <a href="#">Warden Tools</a>
              <a href="#">Upcoming Features</a>
            </div>
            <div className="warden-footer-developer">
              <h3>Developer Contact</h3>
              <p>Need a similar hostel platform or custom website? Reach out to {DEVELOPER_NAME}.</p>
              <a href={`tel:${DEVELOPER_PHONE}`}>Call: {DEVELOPER_PHONE}</a>
              <a href={`mailto:${DEVELOPER_EMAIL}`}>Email: {DEVELOPER_EMAIL}</a>
            </div>
            <div className="warden-footer-newsletter">
              <h3>Monthly Update</h3>
              <p>Get design ideas, hostel tips, and product updates in one short email.</p>
              <div className="warden-footer-form">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={(event) => {
                    setNewsletterEmail(event.target.value);
                    if (newsletterMessage.text) {
                      setNewsletterMessage({ type: "", text: "" });
                    }
                  }}
                />
                <button type="button" onClick={handleNewsletterJoin}>Join</button>
              </div>
              {newsletterMessage.text ? (
                <p className={`warden-footer-form-message ${newsletterMessage.type}`}>
                  {newsletterMessage.text}
                </p>
              ) : null}
            </div>
          </div>

          <div className="warden-footer-bottom">
            <p>All rights reserved @ Machan.</p>
            <span>Better hostel management, cleaner student experience.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default WardenDashboard;

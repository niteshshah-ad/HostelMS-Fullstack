import "../Styles/Studentdashboard.css";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Slider from "react-slick";
import { useNavigate } from "react-router-dom";
import MachanLogo from "../MachanLogo";
import StudentFooter from "../StudentFooter";
import ThemeToggle from "../ThemeToggle";
import { API_BASE_URL, getStaticAssetUrl } from "../lib/api";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
const STUDENT_CURRENT_AREA_SESSION_KEY = "student_current_area_session";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const shuffleHostels = (items) => {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[randomIndex]] = [nextItems[randomIndex], nextItems[index]];
  }

  return nextItems;
};

const normalizeSearchValue = (value) => String(value || "").trim().toLowerCase();

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

const getCurrentPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("Geolocation is not supported"));
    return;
  }

  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
});

const getAreaFromCoordinates = async (latitude, longitude) => {
  const reverseUrl = new URL("https://nominatim.openstreetmap.org/reverse");
  reverseUrl.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "14",
    addressdetails: "1",
  }).toString();

  const response = await fetch(reverseUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const payload = await response.json();
  const address = payload?.address || {};

  return (
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.county ||
    address.city ||
    address.town ||
    address.village ||
    payload?.display_name ||
    ""
  ).trim();
};

function StudentDashboard() {
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState(10000);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [studentProfile, setStudentProfile] = useState({ name: "", email: "", photo: "" });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
    photo: "",
    photoFileName: "",
  });
  const [profileFeedback, setProfileFeedback] = useState({ type: "", message: "" });
  const [bookings, setBookings] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    student_name: "",
    student_email: "",
    phone_number: "",
    aadhaar_id: "",
    gender: "female",
    room_type: "single",
    current_area: "",
    sleeping_time: "late",
    study_habit: "balanced",
    smoking: "never",
    drinking: "never",
    cleanliness: "medium",
    otp_code: "",
    id_proof: null,
  });
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [demoOtp, setDemoOtp] = useState("");
  const [smartInsights, setSmartInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isCancelling, setIsCancelling] = useState("");
  const [expandedBookingId, setExpandedBookingId] = useState("");
  const [expandedFacilitiesId, setExpandedFacilitiesId] = useState("");
  const [showAllHostels, setShowAllHostels] = useState(false);
  const [distanceByHostel, setDistanceByHostel] = useState({});
  const [distanceLoadingId, setDistanceLoadingId] = useState("");
  const [distanceError, setDistanceError] = useState("");
  const [currentDistanceArea, setCurrentDistanceArea] = useState("");
  const [wellnessSummary, setWellnessSummary] = useState(null);
  const [wellnessMessage, setWellnessMessage] = useState("");
  const [isLoadingWellness, setIsLoadingWellness] = useState(false);
  const [isSubmittingWellness, setIsSubmittingWellness] = useState(false);
  const [wellnessForm, setWellnessForm] = useState({
    consent: false,
    mood: "good",
    sleep_hours: 7,
    meals_taken: 3,
    stress_level: 2,
    water_intake_liters: 2,
    meditation_minutes: 10,
    lights_off_when_leave: true,
    short_shower: false,
    used_reusable_bottle: true,
    avoided_food_waste: false,
  });
  const bookingsSectionRef = useRef(null);
  const wellnessSectionRef = useRef(null);
  const authToken = localStorage.getItem("token");
  const authRole = localStorage.getItem("role");
  const isStudentLoggedIn = Boolean(authToken) && authRole === "student";

  const facilityLabels = {
    wifi: "Wi-Fi",
    ac: "AC",
    cooler: "Cooler",
    ro: "RO Water",
  };
  const mealFeatures = ["Breakfast", "Lunch", "Dinner", "Tea + Biscuit"];
  const studentInitial = (studentProfile.name || studentProfile.email || "S").trim().charAt(0).toUpperCase();

  const getImageSrc = (hostel) => {
    if (hostel.image) return hostel.image;

    if (Array.isArray(hostel.images) && hostel.images.length > 0) {
      const firstImage = hostel.images[0];
      if (typeof firstImage === "string") {
        return getStaticAssetUrl(firstImage);
      }
    }

    return "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80";
  };

  const getPrice = (hostel) => {
    return hostel.price || hostel.rent || hostel.rent_min || hostel.rent_max || 0;
  };

  const getHostelKey = (hostel) => hostel._id || hostel.id || hostel.name;
  const getHostelRouteLabel = (hostel) => [hostel.location, hostel.city].filter(Boolean).join(", ") || hostel.name;
  const matchesLocationFilter = (hostel, locationQuery) => {
    const normalizedQuery = normalizeSearchValue(locationQuery);
    if (!normalizedQuery) return true;

    const searchableFields = [
      hostel.location,
      hostel.city,
      hostel.address,
      hostel.area,
    ]
      .map(normalizeSearchValue)
      .filter(Boolean);

    return searchableFields.some((field) => field.includes(normalizedQuery));
  };

  const getAmenityBadges = (hostel) => {
    const facilities = hostel.facilities || {};
    const activeFacilities = Object.entries(facilities)
      .filter(([key, enabled]) => key !== "food" && Boolean(enabled))
      .map(([key]) => facilityLabels[key] || key);

    const customFacilities = Array.isArray(hostel.manualFacilities)
      ? hostel.manualFacilities.filter(Boolean)
      : [];

    if (Boolean(facilities.food) || hostel.mess) {
      activeFacilities.push(...mealFeatures);
    }

    return [...new Set([...activeFacilities, ...customFacilities])].slice(0, 8);
  };

  const getAvailabilityLabel = (hostel) => {
    const rooms = hostel.available_rooms;
    if (typeof rooms !== "number") return "Check availability";
    if (rooms === 0) return "Currently full";
    if (rooms <= 3) return `Only ${rooms} rooms left`;
    return `${rooms} rooms available`;
  };

  const getBookingHostel = (booking) => {
    return hostels.find((hostel) => hostel.name === booking.hostel_name) || null;
  };

  const getBookingLocation = (booking) => {
    const hostel = getBookingHostel(booking);
    return (
      booking.hostel_location ||
      booking.location ||
      hostel?.location ||
      hostel?.city ||
      hostel?.address ||
      "--"
    );
  };

  const getFacilitiesText = (booking) => {
    const hostel = getBookingHostel(booking);
    if (!hostel) return ["Facilities unavailable"];

    const badges = getAmenityBadges(hostel);
    return badges.length > 0 ? badges : ["Safe stay", "Student area"];
  };

  const formatPreference = (value) => {
    if (!value) return "--";
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const getBookingDateValue = (booking) => {
    const rawDate =
      booking?.created_at ||
      booking?.booked_at ||
      booking?.booking_date ||
      booking?.createdAt ||
      booking?.bookedAt ||
      "";

    if (!rawDate) return null;

    const parsedDate = new Date(rawDate);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const formatPolicyDate = (date) => {
    if (!date) return "--";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getCancellationPolicy = (booking) => {
    const bookingDate = getBookingDateValue(booking);

    if (!bookingDate) {
      return {
        isFreeWindowOpen: null,
        message: "Free cancellation is available for 3 days after booking. After that, extra cancellation charges apply.",
      };
    }

    const freeUntil = new Date(bookingDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    const isFreeWindowOpen = Date.now() <= freeUntil.getTime();

    return {
      isFreeWindowOpen,
      freeUntil,
      message: isFreeWindowOpen
        ? `Free cancellation available until ${formatPolicyDate(freeUntil)}.`
        : `Free cancellation ended on ${formatPolicyDate(freeUntil)}. Extra cancellation charges now apply.`,
    };
  };

  // FETCH DATA FROM FASTAPI
  useEffect(() => {
    setLoading(true);
    setError("");
    axios.get(`${API_BASE_URL}/hostels`)
      .then(res => {
        setHostels(res.data);
      })
      .catch(err => {
        console.log(err);
        setError("We couldn't load hostels right now. Please try again.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isStudentLoggedIn) {
      setStudentProfile({ name: "", email: "", photo: "" });
      setBookings([]);
      setWellnessSummary(null);
      setProfileForm({
        name: "",
        email: "",
        currentPassword: "",
        password: "",
        confirmPassword: "",
        photo: "",
        photoFileName: "",
      });
      setProfileFeedback({ type: "", message: "" });
      return;
    }

    const loadStudentData = async () => {
      try {
        const [profileResponse, bookingsResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/auth/profile`, getAuthConfig()),
          axios.get(`${API_BASE_URL}/bookings`, getAuthConfig()),
        ]);

        const profile = profileResponse.data || {};
        setStudentProfile({
          name: profile.name || "",
          email: profile.email || "",
          photo: profile.photo || "",
        });
        setBookingForm((prev) => ({
          ...prev,
          student_name: profile.name || "",
          student_email: profile.email || "",
        }));
        setProfileForm({
          name: profile.name || "",
          email: profile.email || "",
          currentPassword: "",
          password: "",
          confirmPassword: "",
          photo: profile.photo || "",
          photoFileName: "",
        });
        setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
      } catch (loadError) {
        console.error("Failed to load student data", loadError);
      }
    };

    loadStudentData();
  }, [isStudentLoggedIn]);

  useEffect(() => {
    if (!isStudentLoggedIn) return;

    const loadWellnessSummary = async () => {
      setIsLoadingWellness(true);

      try {
        const response = await axios.get(`${API_BASE_URL}/wellness/me`, getAuthConfig());
        setWellnessSummary(response.data);
      } catch (wellnessLoadError) {
        console.error("Failed to load wellness summary", wellnessLoadError);
      } finally {
        setIsLoadingWellness(false);
      }
    };

    loadWellnessSummary();
  }, [isStudentLoggedIn]);

  useEffect(() => {
    const seededArea = (sessionStorage.getItem(STUDENT_CURRENT_AREA_SESSION_KEY) || "").trim();
    if (seededArea) {
      setCurrentDistanceArea(seededArea);
      // Keep it only for the first page load after login, not across refreshes.
      sessionStorage.removeItem(STUDENT_CURRENT_AREA_SESSION_KEY);
    }
  }, []);

  const filtered = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search);

    return hostels.filter((hostel) =>
      normalizeSearchValue(hostel.name).includes(normalizedSearch) &&
      matchesLocationFilter(hostel, location) &&
      getPrice(hostel) <= price
    );
  }, [search, location, price, hostels]);
  const visibleHostels = useMemo(
    () => (showAllHostels ? filtered : filtered.slice(0, 6)),
    [filtered, showAllHostels]
  );
  const hasMoreHostels = filtered.length > 6;
  const sortedBookings = useMemo(() => (
    [...bookings].sort((left, right) => {
      const leftDate = getBookingDateValue(left)?.getTime() || 0;
      const rightDate = getBookingDateValue(right)?.getTime() || 0;
      return rightDate - leftDate;
    })
  ), [bookings]);
  const latestBooking = sortedBookings[0] || null;

  // WISHLIST
  const toggleWishlist = (id) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // BOOKING
  const handleBooking = (id) => {
    if (!isStudentLoggedIn) {
      navigate("/login");
      return;
    }

    const hostel = hostels.find((item) => getHostelKey(item) === id);
    if (!hostel) return;

    setSelectedHostel(hostel);
    setBookingError("");
    setBookingSuccess("");
    setDemoOtp("");
    setSmartInsights(null);
    setBookingForm((prev) => ({
      ...prev,
      student_name: studentProfile.name || prev.student_name,
      student_email: studentProfile.email || prev.student_email,
      phone_number: "",
      aadhaar_id: "",
      gender: "female",
      room_type: "single",
      current_area: "",
      sleeping_time: "late",
      study_habit: "balanced",
      smoking: "never",
      drinking: "never",
      cleanliness: "medium",
      otp_code: "",
      id_proof: null,
    }));
  };

  const closeBookingModal = () => {
    setSelectedHostel(null);
    setBookingError("");
    setDemoOtp("");
    setSmartInsights(null);
  };

  const loadBookings = async () => {
    const response = await axios.get(`${API_BASE_URL}/bookings`, getAuthConfig());
    setBookings(Array.isArray(response.data) ? response.data : []);
  };

  const handleBookingFieldChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "id_proof") {
      setBookingForm((prev) => ({ ...prev, id_proof: files?.[0] || null }));
      return;
    }

    setBookingForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileFieldChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "photo") {
      const file = files?.[0];
      if (!file) {
        setProfileForm((prev) => ({ ...prev, photo: "", photoFileName: "" }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setProfileForm((prev) => ({
          ...prev,
          photo: typeof reader.result === "string" ? reader.result : "",
          photoFileName: file.name,
        }));
      };
      reader.readAsDataURL(file);
      return;
    }

    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    const trimmedName = profileForm.name.trim();
    const trimmedEmail = profileForm.email.trim();
    const trimmedCurrentPassword = profileForm.currentPassword;
    const emailChanged = trimmedEmail !== studentProfile.email;
    const passwordChanged = Boolean(profileForm.password);

    if (!trimmedName) {
      setProfileFeedback({ type: "error", message: "Enter your name before saving your profile." });
      return;
    }

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      setProfileFeedback({ type: "error", message: "Enter a valid email address before saving your profile." });
      return;
    }

    if ((emailChanged || passwordChanged) && !trimmedCurrentPassword) {
      setProfileFeedback({
        type: "error",
        message: "Enter your current password to change your email or password.",
      });
      return;
    }

    if (profileForm.password && !PASSWORD_PATTERN.test(profileForm.password)) {
      setProfileFeedback({
        type: "error",
        message: "Use 8+ characters with uppercase, lowercase, and a number for the new password.",
      });
      return;
    }

    if (profileForm.password !== profileForm.confirmPassword) {
      setProfileFeedback({ type: "error", message: "New password and confirm password must match." });
      return;
    }

    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, {
        name: trimmedName,
        email: trimmedEmail,
        current_password: trimmedCurrentPassword,
        new_password: profileForm.password,
        photo: profileForm.photo,
      }, getAuthConfig());

      const nextProfile = response.data?.profile || {
        name: trimmedName,
        email: trimmedEmail,
        photo: profileForm.photo,
        role: studentProfile.role,
      };

      if (response.data?.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }

      if (response.data?.role) {
        localStorage.setItem("role", response.data.role);
      }

      setStudentProfile({
        name: nextProfile.name || "",
        email: nextProfile.email || "",
        photo: nextProfile.photo || "",
      });
      setBookingForm((prev) => ({
        ...prev,
        student_name: nextProfile.name || "",
        student_email: nextProfile.email || "",
      }));
      setProfileForm((prev) => ({
        ...prev,
        name: nextProfile.name || "",
        email: nextProfile.email || "",
        currentPassword: "",
        password: "",
        confirmPassword: "",
        photo: nextProfile.photo || "",
      }));
      setProfileFeedback({
        type: "success",
        message: response.data?.message || "Profile updated successfully.",
      });
    } catch (profileSaveError) {
      console.error("Failed to update student profile", profileSaveError);
      setProfileFeedback({
        type: "error",
        message: profileSaveError.response?.data?.detail || "Profile could not be updated right now.",
      });
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedHostel) return;
    if (!bookingForm.current_area.trim()) {
      setBookingError("Enter your current staying area to calculate commute and smart match.");
      return;
    }

    setBookingError("");
    setIsGeneratingInsights(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/bookings/matchmaking`, {
        hostel_id: selectedHostel.id || selectedHostel._id || "",
        hostel_name: selectedHostel.name,
        room_type: bookingForm.room_type,
        gender: bookingForm.gender,
        current_area: bookingForm.current_area,
        sleeping_time: bookingForm.sleeping_time,
        study_habit: bookingForm.study_habit,
        smoking: bookingForm.smoking,
        drinking: bookingForm.drinking,
        cleanliness: bookingForm.cleanliness,
      }, getAuthConfig());

      setSmartInsights(response.data);
      setBookingSuccess("Smart booking insights are ready. Review them before payment.");
    } catch (insightError) {
      console.error("Failed to generate insights", insightError);
      setBookingError(insightError.response?.data?.detail || "Smart insights could not be generated.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const validateBookingForm = () => {
    if (!selectedHostel) return "Please choose a hostel first.";
    if (!bookingForm.student_name.trim()) return "Student name is required.";
    if (!bookingForm.student_email.trim()) return "Email is required.";
    if (!bookingForm.phone_number.trim()) return "Phone number is required.";
    if (!bookingForm.aadhaar_id.trim()) return "Aadhaar ID is required.";
    if (!bookingForm.otp_code.trim()) return "Enter OTP before payment.";
    if (!bookingForm.id_proof) return "Upload Aadhaar or ID proof image.";
    if (!demoOtp) return "Generate OTP first, then continue to payment.";

    return "";
  };

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSendOtp = async () => {
    if (!bookingForm.phone_number.trim()) {
      setBookingError("Enter phone number before requesting OTP.");
      return;
    }

    setBookingError("");
    setIsSendingOtp(true);

    try {
      const formData = new FormData();
      formData.append("phone_number", bookingForm.phone_number);

      const response = await axios.post(`${API_BASE_URL}/bookings/send-otp`, formData, getAuthConfig());
      setDemoOtp(response.data?.dev_otp || "");
      setBookingSuccess("OTP generated. Use the shown demo OTP for now.");
    } catch (otpError) {
      console.error("Failed to send OTP", otpError);
      setBookingError(otpError.response?.data?.detail || "OTP could not be generated.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();

    if (!selectedHostel) return;

    const validationMessage = validateBookingForm();
    if (validationMessage) {
      setBookingError(validationMessage);
      return;
    }

    setBookingError("");
    setBookingSuccess("");
    setIsBooking(true);

    try {
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        throw new Error("Razorpay SDK failed to load.");
      }

      const amount = Number(getPrice(selectedHostel) || 500);
      const orderResponse = await axios.post(`${API_BASE_URL}/payments/create-order`, {
        amount,
        receipt: `hostel_${Date.now()}`,
        notes: {
          hostel_name: selectedHostel.name,
          student_email: bookingForm.student_email,
        },
      });

      const order = orderResponse.data;

      const paymentResult = await new Promise((resolve, reject) => {
        const razorpay = new window.Razorpay({
          key: "rzp_test_SJsO9PYAPhiYA7",
          amount: order.amount,
          currency: order.currency,
          name: "Hostel Admin",
          description: `Booking for ${selectedHostel.name}`,
          order_id: order.id,
          prefill: {
            name: bookingForm.student_name,
            email: bookingForm.student_email,
            contact: bookingForm.phone_number,
          },
          handler: (response) => resolve(response),
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled before completion.")),
          },
        });

        razorpay.open();
      });

      await axios.post(`${API_BASE_URL}/payments/verify-payment`, paymentResult);

      const bookingPayload = new FormData();
      bookingPayload.append("hostel_name", selectedHostel.name);
      if (selectedHostel.id) bookingPayload.append("hostel_id", selectedHostel.id);
      bookingPayload.append("room_type", bookingForm.room_type);
      bookingPayload.append("student_name", bookingForm.student_name);
      bookingPayload.append("student_email", bookingForm.student_email);
      bookingPayload.append("phone_number", bookingForm.phone_number);
      bookingPayload.append("aadhaar_id", bookingForm.aadhaar_id);
      bookingPayload.append("gender", bookingForm.gender);
      bookingPayload.append("current_area", bookingForm.current_area);
      bookingPayload.append("sleeping_time", bookingForm.sleeping_time);
      bookingPayload.append("study_habit", bookingForm.study_habit);
      bookingPayload.append("smoking", bookingForm.smoking);
      bookingPayload.append("drinking", bookingForm.drinking);
      bookingPayload.append("cleanliness", bookingForm.cleanliness);
      bookingPayload.append("otp_code", bookingForm.otp_code);
      bookingPayload.append("booking_amount", String(amount));
      bookingPayload.append("payment_id", paymentResult.razorpay_payment_id);
      bookingPayload.append("payment_order_id", paymentResult.razorpay_order_id);
      bookingPayload.append("payment_signature", paymentResult.razorpay_signature);
      if (bookingForm.id_proof) {
        bookingPayload.append("id_proof", bookingForm.id_proof);
      }

      await axios.post(`${API_BASE_URL}/bookings`, bookingPayload, {
        ...getAuthConfig(),
        headers: {
          ...getAuthConfig().headers,
          "Content-Type": "multipart/form-data",
        },
      });

      await loadBookings();
      closeBookingModal();
      setBookingSuccess("Booking confirmed and saved successfully.");
    } catch (submitError) {
      console.error("Booking failed", submitError);
      setBookingError(
        submitError.response?.data?.detail || submitError.message || "Booking could not be completed."
      );
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    setIsCancelling(bookingId);
    setBookingError("");
    setBookingSuccess("");

    try {
      const formData = new FormData();
      formData.append("reason", "Cancelled by student");
      await axios.post(`${API_BASE_URL}/bookings/${bookingId}/cancel`, formData, getAuthConfig());
      await loadBookings();
      setBookingSuccess("Booking cancelled. Cancellation charge has been applied.");
    } catch (cancelError) {
      console.error("Failed to cancel booking", cancelError);
      setBookingError(cancelError.response?.data?.detail || "Booking could not be cancelled.");
    } finally {
      setIsCancelling("");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  const handleResetFilters = () => {
    setSearch("");
    setLocation("");
    setPrice(10000);
    setShowAllHostels(false);
  };

  useEffect(() => {
    setShowAllHostels(false);
  }, [search, location, price]);

  const scrollToBookings = () => {
    if (!isStudentLoggedIn) {
      navigate("/login");
      return;
    }

    bookingsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const scrollToWellness = () => {
    if (!isStudentLoggedIn) {
      navigate("/login");
      return;
    }

    wellnessSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const toggleFacilitiesDropdown = (hostelId) => {
    setExpandedFacilitiesId((prev) => (prev === hostelId ? "" : hostelId));
  };

  const handleWellnessFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setWellnessForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (type === "number" ? Number(value) : value),
    }));
  };

  const handleWellnessSubmit = async (event) => {
    event.preventDefault();
    setWellnessMessage("");

    if (!wellnessForm.consent) {
      setWellnessMessage("Please enable the opt-in checkbox before saving your wellness check-in.");
      return;
    }

    setIsSubmittingWellness(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/wellness/checkin`, wellnessForm, getAuthConfig());
      setWellnessSummary(response.data?.summary || null);
      setWellnessMessage(response.data?.message || "Wellness check-in saved.");
    } catch (wellnessSubmitError) {
      setWellnessMessage(
        wellnessSubmitError.response?.data?.detail || "Wellness check-in could not be saved right now."
      );
    } finally {
      setIsSubmittingWellness(false);
    }
  };

  const openDistanceInGoogleMaps = (hostel) => {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(getHostelRouteLabel(hostel))}&travelmode=driving`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const resolveCurrentArea = async ({ forceRefresh = false } = {}) => {
    if (!forceRefresh) {
      if (currentDistanceArea.trim()) return currentDistanceArea.trim();
    }

    try {
      const position = await getCurrentPosition();
      const detectedArea = await getAreaFromCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      if (detectedArea) {
        setCurrentDistanceArea(detectedArea);
        return detectedArea;
      }
    } catch (locationError) {
      console.error("Failed to detect current location", locationError);
    }

    const enteredArea = window.prompt("Enter your current area to calculate distance.");
    const trimmedArea = enteredArea?.trim() || "";

    if (!trimmedArea) return "";

    setCurrentDistanceArea(trimmedArea);
    return trimmedArea;
  };

  const handleDistanceLookup = async (hostel, { forceRefresh = false } = {}) => {
    if (!isStudentLoggedIn) {
      navigate("/login");
      return;
    }

    const currentArea = await resolveCurrentArea({ forceRefresh });
    if (!currentArea) return;

    setDistanceError("");
    setDistanceLoadingId(getHostelKey(hostel));

    try {
      const response = await axios.post(`${API_BASE_URL}/bookings/matchmaking`, {
        hostel_id: hostel._id || hostel.id || null,
        hostel_name: hostel.name,
        room_type: "single",
        gender: bookingForm.gender || "female",
        current_area: currentArea,
        sleeping_time: "late",
        study_habit: "balanced",
        smoking: "never",
        drinking: "never",
        cleanliness: "medium",
      }, getAuthConfig());

      setDistanceByHostel((prev) => ({
        ...prev,
        [getHostelKey(hostel)]: {
          ...(response.data?.commute || {}),
          current_area: currentArea,
        },
      }));
    } catch (distanceLookupError) {
      console.error("Failed to calculate distance", distanceLookupError);
      setDistanceError(
        distanceLookupError.response?.data?.detail || "Distance could not be calculated right now."
      );
    } finally {
      setDistanceLoadingId("");
    }
  };

  // 🎠 CAROUSEL SETTINGS
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 1,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  const featuredHostels = useMemo(() => (
    shuffleHostels(hostels).slice(0, Math.min(hostels.length, 4))
  ), [hostels]);
  const topPick = featuredHostels[0];
  const quickStats = [
    {
      label: "Live hostels",
      value: hostels.length,
      tone: "warm",
    },
    {
      label: "Shortlisted",
      value: wishlist.length,
      tone: "soft",
    },
    {
      label: "Best budget",
      value: filtered.length > 0 ? `₹${Math.min(...filtered.map(getPrice))}` : "--",
      tone: "green",
    },
  ];

  return (
    <div className="student-dashboard">
      <div className="student-navbar">
        <div className="student-navbar-brand">
          <div className="student-navbar-brand-row">
            <MachanLogo compact subtitle="Student Portal" />
          </div>
          <p className="student-eyebrow">Student Portal</p>
          <h2>Find a hostel that actually feels right</h2>
        </div>
        <div className="student-navbar-actions">
          <div className="student-navbar-action-row">
            <button
              className="student-about-btn"
              type="button"
              onClick={() => navigate("/home?section=about")}
            >
              About
            </button>
            <ThemeToggle />
            <button className="student-bookings-btn" type="button" onClick={scrollToWellness}>Wellness</button>
          </div>

          <div className="student-navbar-action-row">
            <button className="student-bookings-btn" onClick={scrollToBookings}>My Bookings</button>
            {isStudentLoggedIn ? (
              <button className="student-logout-btn" onClick={handleLogout}>Logout</button>
            ) : (
              <button className="student-logout-btn" type="button" onClick={() => navigate("/login")}>
                Login
              </button>
            )}
            {isStudentLoggedIn && (
              <button
                className="student-profile-trigger"
                type="button"
                onClick={() => {
                  setProfileFeedback({ type: "", message: "" });
                  setIsProfileOpen(true);
                }}
                aria-label="Open student profile"
                title="Open student profile"
              >
                {studentProfile.photo ? (
                  <img src={studentProfile.photo} alt={studentProfile.name || "Student profile"} />
                ) : (
                  <span>{studentInitial}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="student-hero-panel">
        <div className="student-hero-copy">
          <span className="student-hero-badge">Curated stays for students</span>
          <h1>Search, compare, shortlist, and book with confidence.</h1>
          <p>
            Explore verified hostels by location, budget, and ratings. Keep your
            favorites handy and move fast when you find the right fit.
          </p>

          <div className="student-hero-stats">
            {quickStats.map((stat) => (
              <div className={`student-stat-card ${stat.tone}`} key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          {topPick && (
            <div className="student-featured-strip">
              <div>
                <p className="student-featured-label">Top pick this week</p>
                <h3>{topPick.name}</h3>
                <span>{topPick.location || topPick.city || "Prime location"}</span>
              </div>
              <strong>₹{getPrice(topPick)}/mo</strong>
            </div>
          )}

          <div className="student-hero-notes">
            <div className="student-hero-note-card">
              <span>Why students shortlist faster</span>
              <strong>Clear pricing, real amenities, and quick filtering in one view.</strong>
            </div>
            <div className="student-hero-note-list">
              <p>Use the location and budget filters to narrow options in seconds.</p>
              <p>Save hostels you like first, then compare the best ones before booking.</p>
              <p>Fresh listings rotate automatically in the hero so you notice new options faster.</p>
            </div>
          </div>
        </div>

        <div className="student-hero-slider">
          {featuredHostels.length > 0 ? (
            <>
              <Slider {...settings}>
                {featuredHostels.map((h) => (
                  <div key={getHostelKey(h)} className="student-carousel-slide">
                    <div className="student-carousel-card">
                      <img src={getImageSrc(h)} alt={h.name} />
                      <div className="student-carousel-overlay">
                        <span className="student-carousel-tag">{getAvailabilityLabel(h)}</span>
                        <p>{h.location || h.city || "Popular area"}</p>
                        <h3>{h.name}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </Slider>

              <div className="student-hero-slider-footer">
                <div className="student-hero-slider-copy">
                  <span>Live preview</span>
                  <strong>Swipe through a curated set of stays before you dive into the full list.</strong>
                  <p>
                    The hero keeps rotating featured hostels so the right side feels active instead
                    of empty, even when your listings grow.
                  </p>
                  <div className="student-hero-slider-badges">
                    <span>Auto rotating</span>
                    <span>Fresh picks</span>
                    <span>Student ready</span>
                  </div>
                </div>

                <div className="student-hero-slider-points">
                  <div>
                    <strong>{featuredHostels.length}</strong>
                    <span>hero picks</span>
                  </div>
                  <div>
                    <strong>{topPick ? getAvailabilityLabel(topPick) : "--"}</strong>
                    <span>top status</span>
                  </div>
                  <div>
                    <strong>{topPick ? `₹${getPrice(topPick)}/mo` : "--"}</strong>
                    <span>starting pick</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="student-hero-empty">
              <h3>Fresh listings will appear here</h3>
              <p>As soon as hostels are available, this space will highlight the best options.</p>
            </div>
          )}
        </div>
      </section>

      <section className="student-discovery-shell">
        <div className="student-filters">
          <div className="student-filter-heading">
            <h3>Refine your search</h3>
            <p>Set your preferences and narrow the list in real time.</p>
          </div>

          <div className="student-filter-grid">
            <label className="student-filter-field">
              <span>Hostel Name</span>
              <input
                type="text"
                placeholder="Search hostel..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label className="student-filter-field">
              <span>Location</span>
              <input
                type="text"
                placeholder="Enter area or city"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>

            <label className="student-filter-field student-filter-range">
              <span>Budget Limit</span>
              <input
                type="range"
                min="1000"
                max="10000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
              <strong>Up to ₹{price}</strong>
            </label>

          </div>

          <div className="student-filter-footer">
            <div className="student-active-filters">
              <span className="student-active-filter-chip" title={`${filtered.length} results`}>{filtered.length} results</span>
              <span
                className="student-active-filter-chip"
                title={location ? `Area: ${location}` : "All locations"}
              >
                {location ? `Area: ${location}` : "All locations"}
              </span>
              <span
                className="student-active-filter-chip"
                title={search ? `Search: ${search}` : "Any hostel name"}
              >
                {search ? `Search: ${search}` : "Any hostel name"}
              </span>
            </div>
            <button className="student-reset-btn" onClick={handleResetFilters}>
              Reset Filters
            </button>
          </div>
        </div>

        <div className="student-results-shell">
          <section className="student-section-head">
            <div>
              <p className="student-section-kicker">Discover stays</p>
              <h2>Recommended hostels for your budget</h2>
            </div>
            <p>Browse clean, affordable options with the amenities students actually care about.</p>
          </section>

          {loading ? (
            <div className="student-skeleton-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="student-skeleton-card" key={index}>
                  <div className="student-skeleton-image" />
                  <div className="student-skeleton-line short" />
                  <div className="student-skeleton-line" />
                  <div className="student-skeleton-chip-row">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="student-empty-state">
              <h3>{error}</h3>
              <p>Check whether the backend is running on `http://127.0.0.1:8000` and try again.</p>
            </div>
          ) : (
            <>
              <div className="student-hostel-list">
                {filtered.length > 0 ? (
                visibleHostels.map((h) => (
                  (() => {
                  const hostelId = getHostelKey(h);
                  const facilities = getAmenityBadges(h);
                  const isFacilitiesOpen = expandedFacilitiesId === hostelId;
                  const distanceInfo = distanceByHostel[hostelId];
                  const isDistanceLoading = distanceLoadingId === hostelId;

                    return (
                  <div
                    className={`student-hostel-card ${isFacilitiesOpen ? "facilities-open" : ""}`}
                    key={hostelId}
                  >
                    <div className="student-card-media">
                      <img src={getImageSrc(h)} alt={h.name} />
                      <span className="student-card-status">{getAvailabilityLabel(h)}</span>
                      <button
                        className={`student-wishlist-btn ${wishlist.includes(hostelId) ? "active" : ""}`}
                        onClick={() => toggleWishlist(hostelId)}
                        aria-label="Toggle wishlist"
                      >
                        {wishlist.includes(hostelId) ? "♥" : "♡"}
                      </button>
                    </div>

                    <div className="student-card-content">
                      <div className="student-card-topline">
                        <span className="student-location-pill">{h.location || h.city || "Great location"}</span>
                        <span className="student-rating-pill">★ {h.rating || 4.5}</span>
                      </div>

                      <h3>{h.name}</h3>
                      <p className="student-address">{h.address || "Verified student-friendly property"}</p>
                      <p className="student-price">₹{getPrice(h)} <span>/ month</span></p>

                      <div className="student-facility-panel">
                        <button
                          className={`student-facility-toggle ${isFacilitiesOpen ? "open" : ""}`}
                          type="button"
                          onClick={() => toggleFacilitiesDropdown(hostelId)}
                        >
                          {isFacilitiesOpen ? "Hide Facilities" : "See Facilities"}
                        </button>

                        {isFacilitiesOpen && (
                          <div className="student-facility-dropdown">
                            {(facilities.length > 0 ? facilities : ["Safe stay", "Student area"]).map((badge) => (
                              <span className="student-amenity-chip" key={`${hostelId}-${badge}`}>{badge}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="student-card-actions">
                        <button className="student-secondary-btn" onClick={() => toggleWishlist(hostelId)}>
                          {wishlist.includes(hostelId) ? "Saved" : "Save"}
                        </button>
                        <button className="student-primary-btn" onClick={() => handleBooking(hostelId)}>
                          Book Now
                        </button>
                      </div>

                      <div className="student-commute-panel">
                        {distanceInfo ? (
                          <div className="student-distance-card">
                            <div className="student-distance-head">
                              <strong>{distanceInfo.distance_km} km away</strong>
                              <span>{distanceInfo.current_area} to {distanceInfo.to_area}</span>
                            </div>
                            <div className="student-distance-meta">
                              <span>{distanceInfo.estimated_minutes} min</span>
                              <span>{distanceInfo.recommended_transport}</span>
                              <span>₹{distanceInfo.recommended_transport_cost_per_ride}/ride</span>
                            </div>
                            <div className="student-distance-actions">
                              <button
                                className="student-secondary-btn"
                                type="button"
                                onClick={() => handleDistanceLookup(h, { forceRefresh: true })}
                              >
                                Refresh Distance
                              </button>
                              <button
                                className="student-commute-btn"
                                type="button"
                                onClick={() => openDistanceInGoogleMaps(h)}
                              >
                                Open Route
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="student-commute-btn"
                            type="button"
                            onClick={() => handleDistanceLookup(h)}
                            disabled={isDistanceLoading}
                          >
                            {isDistanceLoading ? "Calculating..." : "See Distance"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ))
              ) : (
                <div className="student-empty-state">
                  <h3>No hostels match your filters</h3>
                  <p>Try a broader location, a different name, or increase the budget range.</p>
                </div>
              )}
            </div>

              {hasMoreHostels && (
                <button
                  className="student-see-more-btn"
                  type="button"
                  onClick={() => setShowAllHostels((prev) => !prev)}
                >
                  {showAllHostels ? "Show Less" : "See More Hostels"}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      <section className="student-bookings-shell" ref={bookingsSectionRef}>
        <div className="student-section-head">
          <div>
            <p className="student-section-kicker">My bookings</p>
            <h2>Track confirmed stays and cancel when plans change</h2>
          </div>
          <p>Your bookings stay linked to your account, payment, and verification details.</p>
        </div>

        {bookingSuccess && <div className="student-booking-banner success">{bookingSuccess}</div>}
        {bookingError && <div className="student-booking-banner error">{bookingError}</div>}
        {distanceError && <div className="student-booking-banner error">{distanceError}</div>}

        {!isStudentLoggedIn ? (
          <div className="student-empty-state">
            <h3>Login required for bookings</h3>
            <p>Anyone can browse hostels here, but you need a student login to book a hostel or view booking history.</p>
          </div>
        ) : bookings.length > 0 ? (
          <div className="student-bookings-grid">
            {bookings.map((booking) => (
              <article className="student-booking-card" key={booking.id}>
                {(() => {
                  const cancellationPolicy = getCancellationPolicy(booking);

                  return (
                    <>
                <div className="student-booking-head">
                  <div>
                    <span className={`student-booking-status ${booking.status}`}>{booking.status}</span>
                    <button
                      className="student-booking-title-btn"
                      type="button"
                      onClick={() => setExpandedBookingId((prev) => (prev === booking.id ? "" : booking.id))}
                    >
                      {booking.hostel_name}
                    </button>
                  </div>
                  <strong>₹{booking.booking_amount || 0}</strong>
                </div>

                <div className="student-booking-meta">
                  <span>Room type: {booking.room_type || "--"}</span>
                  <span>Phone: {booking.phone_number || "--"}</span>
                  <span>Aadhaar: {booking.aadhaar_id || "--"}</span>
                  <span>Gender: {booking.gender || "--"}</span>
                </div>

                <div className="student-booking-actions">
                  <button
                    className="student-secondary-btn"
                    onClick={() => handleCancelBooking(booking.id)}
                    disabled={booking.status === "cancelled" || isCancelling === booking.id}
                  >
                    {isCancelling === booking.id ? "Cancelling..." : booking.status === "cancelled" ? "Cancelled" : "Cancel Booking"}
                  </button>
                  {booking.status !== "cancelled" && (
                    <p className={`student-cancellation-note ${cancellationPolicy.isFreeWindowOpen === false ? "expired" : ""}`}>
                      {cancellationPolicy.message}
                    </p>
                  )}
                </div>

                {expandedBookingId === booking.id && (
                  <div className="student-booking-details">
                    <div className="student-booking-detail-group">
                      <span>Hostel details</span>
                      <p>Name: {booking.hostel_name}</p>
                      <p>Room type: {booking.room_type || "--"}</p>
                      <p>Room number: {booking.room_number || "--"}</p>
                    </div>

                    <div className="student-booking-detail-group">
                      <span>Facilities</span>
                      <div className="student-booking-facilities">
                        {getFacilitiesText(booking).map((item) => (
                          <strong key={`${booking.id}-${item}`}>{item}</strong>
                        ))}
                      </div>
                    </div>

                    <div className="student-booking-detail-group">
                      <span>Payment details</span>
                      <p>Amount: ₹{booking.booking_amount || 0}</p>
                      <p>Payment ID: {booking.payment_id || "--"}</p>
                      <p>Order ID: {booking.payment_order_id || "--"}</p>
                      <p>Cancellation policy: {cancellationPolicy.message}</p>
                      <p>Refund: {booking.refund_amount ? `₹${booking.refund_amount}` : "--"}</p>
                      <p>Cancellation charge: {booking.cancellation_charge ? `₹${booking.cancellation_charge}` : "--"}</p>
                    </div>

                    <div className="student-booking-detail-group">
                      <span>Smart stay insights</span>
                      <p>Current area: {booking.current_area || "--"}</p>
                      <p>Roommate match: {booking.roommate_match_name || "Waiting for a compatible roommate"}</p>
                      <p>Match score: {booking.roommate_match_score ? `${booking.roommate_match_score}%` : "--"}</p>
                      <p>Commute distance: {booking.commute_distance_km ? `${booking.commute_distance_km} km` : "--"}</p>
                      <p>Recommended transport: {booking.transport_mode || "--"}</p>
                      <p>Travel cost per ride: {booking.transport_cost_per_ride ? `₹${booking.transport_cost_per_ride}` : "--"}</p>
                      <p>Total monthly travel cost: {booking.transport_cost_monthly ? `₹${booking.transport_cost_monthly}/month` : "--"}</p>
                      <p>Predicted monthly cost: {booking.predicted_monthly_cost ? `₹${booking.predicted_monthly_cost}` : "--"}</p>
                      {booking.google_maps_url && (
                        <p>
                          <a href={booking.google_maps_url} target="_blank" rel="noreferrer">
                            Open route in Google Maps
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="student-booking-detail-group">
                      <span>Roommate preferences</span>
                      <p>Sleeping time: {formatPreference(booking.sleeping_time)}</p>
                      <p>Study habit: {formatPreference(booking.study_habit)}</p>
                      <p>Smoking: {formatPreference(booking.smoking)}</p>
                      <p>Drinking: {formatPreference(booking.drinking)}</p>
                      <p>Cleanliness: {formatPreference(booking.cleanliness)}</p>
                    </div>
                  </div>
                )}
                    </>
                  );
                })()}
              </article>
            ))}
          </div>
        ) : (
          <div className="student-empty-state">
            <h3>No bookings yet</h3>
            <p>Once you complete a booking with Razorpay, it will appear here.</p>
          </div>
        )}
      </section>

      {isProfileOpen && isStudentLoggedIn && (
        <div className="student-profile-modal-backdrop" onClick={() => setIsProfileOpen(false)}>
          <div className="student-profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="student-profile-modal-head">
              <div className="student-profile-headline">
                <div className="student-profile-avatar-large">
                  {studentProfile.photo ? (
                    <img src={studentProfile.photo} alt={studentProfile.name || "Student profile"} />
                  ) : (
                    <span>{studentInitial}</span>
                  )}
                </div>
                <div>
                  <p className="student-section-kicker">Student profile</p>
                  <h2>{studentProfile.name || "Student account"}</h2>
                  <p>{studentProfile.email || "No email available"}</p>
                </div>
              </div>
              <button className="student-booking-close" type="button" onClick={() => setIsProfileOpen(false)}>
                Close
              </button>
            </div>

            <div className="student-profile-layout">
              <div className="student-profile-column">
                <div className="student-profile-summary-grid">
                  <div className="student-profile-summary-card">
                    <span>Total bookings</span>
                    <strong>{bookings.length}</strong>
                  </div>
                  <div className="student-profile-summary-card">
                    <span>Total paid</span>
                    <strong>₹{bookings.reduce((total, booking) => total + Number(booking.booking_amount || 0), 0)}</strong>
                  </div>
                  <div className="student-profile-summary-card">
                    <span>Last booked hostel</span>
                    <strong>{latestBooking?.hostel_name || "--"}</strong>
                  </div>
                </div>

                <div className="student-profile-panel">
                  <div className="student-profile-panel-head">
                    <span className="student-booking-summary-label">Current stay details</span>
                    <h3>Latest booking overview</h3>
                  </div>

                  {latestBooking ? (
                    <div className="student-profile-booking-highlight">
                      <p><strong>Hostel:</strong> {latestBooking.hostel_name || "--"}</p>
                      <p><strong>Location:</strong> {getBookingLocation(latestBooking)}</p>
                      <p><strong>Paid:</strong> ₹{latestBooking.booking_amount || 0}</p>
                      <p><strong>Room type:</strong> {latestBooking.room_type || "--"}</p>
                      <div className="student-booking-facilities">
                        {getFacilitiesText(latestBooking).map((item) => (
                          <strong key={`profile-${latestBooking.id}-${item}`}>{item}</strong>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="student-profile-empty">No hostel booked yet. Once a booking is completed, it will show here.</p>
                  )}
                </div>

                <div className="student-profile-panel">
                  <div className="student-profile-panel-head">
                    <span className="student-booking-summary-label">Booking history</span>
                    <h3>All booked hostels</h3>
                  </div>

                  {sortedBookings.length > 0 ? (
                    <div className="student-profile-history">
                      {sortedBookings.map((booking) => (
                        <article className="student-profile-history-card" key={`profile-history-${booking.id}`}>
                          <div className="student-profile-history-top">
                            <strong>{booking.hostel_name}</strong>
                            <span>₹{booking.booking_amount || 0}</span>
                          </div>
                          <p>Location: {getBookingLocation(booking)}</p>
                          <p>Facilities: {getFacilitiesText(booking).join(", ")}</p>
                          <p>Status: {booking.status || "--"}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="student-profile-empty">Booking history will appear here after the first hostel booking.</p>
                  )}
                </div>
              </div>

              <form className="student-profile-panel student-profile-form" onSubmit={handleProfileSave}>
                <div className="student-profile-panel-head">
                  <span className="student-booking-summary-label">Account settings</span>
                  <h3>Update email, password, and photo</h3>
                </div>

                <label>
                  <span>Full Name</span>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileFieldChange}
                    placeholder="Enter your full name"
                  />
                </label>

                <label>
                  <span>Email ID</span>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileFieldChange}
                    placeholder="Enter your email"
                  />
                </label>

                <label>
                  <span>Current password</span>
                  <input
                    name="currentPassword"
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={handleProfileFieldChange}
                    placeholder="Required for email or password change"
                  />
                </label>

                <label>
                  <span>New password</span>
                  <input
                    name="password"
                    type="password"
                    value={profileForm.password}
                    onChange={handleProfileFieldChange}
                    placeholder="New password"
                  />
                </label>

                <label>
                  <span>Confirm password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={profileForm.confirmPassword}
                    onChange={handleProfileFieldChange}
                    placeholder="Confirm new password"
                  />
                </label>

                <label>
                  <span>Profile photo</span>
                  <input name="photo" type="file" accept="image/*" onChange={handleProfileFieldChange} />
                  {profileForm.photoFileName ? (
                    <small className="student-profile-file-note">Selected: {profileForm.photoFileName}</small>
                  ) : (
                    <small className="student-profile-file-note">Choose a photo to update the profile icon.</small>
                  )}
                </label>

                {profileFeedback.message && (
                  <div className={`student-profile-feedback ${profileFeedback.type || "success"}`}>
                    {profileFeedback.message}
                  </div>
                )}

                <p className="student-profile-note">
                  Name, email, password, and photo now update your real account. Enter the current password whenever you change email or password.
                </p>

                <button className="student-primary-btn" type="submit">Save Profile</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <section className="student-wellness-shell" ref={wellnessSectionRef}>
        <div className="student-section-head">
          <div>
            <p className="student-section-kicker">Wellness & Eco</p>
            <h2>Track wellbeing and greener daily habits</h2>
          </div>
          <p>Opt-in only: students can log a quick daily check-in and get supportive tips plus eco badges.</p>
        </div>

        {!isStudentLoggedIn ? (
          <div className="student-empty-state">
            <h3>Login required for wellness tracking</h3>
            <p>Students need to log in before saving daily wellness or sustainability check-ins.</p>
          </div>
        ) : (
          <div className="student-wellness-layout">
            <form className="student-wellness-card" onSubmit={handleWellnessSubmit}>
              <div className="student-wellness-head">
                <div>
                  <span className="student-booking-summary-label">Daily check-in</span>
                  <h3>How are you doing today?</h3>
                </div>
                <label className="student-wellness-consent">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={wellnessForm.consent}
                    onChange={handleWellnessFieldChange}
                  />
                  <span>I opt in to wellness tracking</span>
                </label>
              </div>

              <div className="student-wellness-grid">
                <label>
                  <span>Mood</span>
                  <select name="mood" value={wellnessForm.mood} onChange={handleWellnessFieldChange}>
                    <option value="great">Great</option>
                    <option value="good">Good</option>
                    <option value="okay">Okay</option>
                    <option value="low">Low</option>
                    <option value="overwhelmed">Overwhelmed</option>
                  </select>
                </label>

                <label>
                  <span>Sleep Hours</span>
                  <input type="number" min="0" max="24" step="0.5" name="sleep_hours" value={wellnessForm.sleep_hours} onChange={handleWellnessFieldChange} />
                </label>

                <label>
                  <span>Meals Taken</span>
                  <select name="meals_taken" value={wellnessForm.meals_taken} onChange={handleWellnessFieldChange}>
                    <option value={0}>0</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </label>

                <label>
                  <span>Stress Level</span>
                  <select name="stress_level" value={wellnessForm.stress_level} onChange={handleWellnessFieldChange}>
                    <option value={1}>1 - Very low</option>
                    <option value={2}>2 - Low</option>
                    <option value={3}>3 - Medium</option>
                    <option value={4}>4 - High</option>
                    <option value={5}>5 - Very high</option>
                  </select>
                </label>

                <label>
                  <span>Water Intake (L)</span>
                  <input type="number" min="0" max="10" step="0.5" name="water_intake_liters" value={wellnessForm.water_intake_liters} onChange={handleWellnessFieldChange} />
                </label>

                <label>
                  <span>Meditation (min)</span>
                  <input type="number" min="0" max="180" step="5" name="meditation_minutes" value={wellnessForm.meditation_minutes} onChange={handleWellnessFieldChange} />
                </label>
              </div>

              <div className="student-wellness-toggle-grid">
                <label><input type="checkbox" name="lights_off_when_leave" checked={wellnessForm.lights_off_when_leave} onChange={handleWellnessFieldChange} /> <span>Lights off when leaving</span></label>
                <label><input type="checkbox" name="short_shower" checked={wellnessForm.short_shower} onChange={handleWellnessFieldChange} /> <span>Short shower</span></label>
                <label><input type="checkbox" name="used_reusable_bottle" checked={wellnessForm.used_reusable_bottle} onChange={handleWellnessFieldChange} /> <span>Reusable bottle</span></label>
                <label><input type="checkbox" name="avoided_food_waste" checked={wellnessForm.avoided_food_waste} onChange={handleWellnessFieldChange} /> <span>Avoided food waste</span></label>
              </div>

              {wellnessMessage && <p className="student-wellness-message">{wellnessMessage}</p>}

              <button className="student-primary-btn" type="submit" disabled={isSubmittingWellness}>
                {isSubmittingWellness ? "Saving..." : "Save Daily Check-In"}
              </button>
            </form>

            <div className="student-wellness-card">
              <div className="student-wellness-head">
                <div>
                  <span className="student-booking-summary-label">Your summary</span>
                  <h3>Wellness snapshot</h3>
                </div>
              </div>

              {isLoadingWellness ? (
                <p className="student-wellness-empty">Loading your wellness summary...</p>
              ) : wellnessSummary?.latest ? (
                <>
                  <div className="student-wellness-score-grid">
                    <div>
                      <strong>{wellnessSummary.latest.wellness_score}</strong>
                      <span>Wellness score</span>
                    </div>
                    <div>
                      <strong>{wellnessSummary.latest.eco_score}</strong>
                      <span>Eco score</span>
                    </div>
                    <div>
                      <strong>{wellnessSummary.streak_days}</strong>
                      <span>Day streak</span>
                    </div>
                    <div>
                      <strong>{wellnessSummary.average_wellness_score ?? "--"}</strong>
                      <span>Avg. wellness</span>
                    </div>
                  </div>

                  <div className="student-wellness-list">
                    <h4>Personalized tips</h4>
                    {wellnessSummary.latest.tips?.length > 0 ? (
                      wellnessSummary.latest.tips.map((tip) => <p key={tip}>{tip}</p>)
                    ) : (
                      <p>No tips yet. Save a check-in to get AI-style suggestions.</p>
                    )}
                  </div>

                  <div className="student-wellness-list">
                    <h4>Badges</h4>
                    <div className="student-wellness-badges">
                      {wellnessSummary.latest.badges?.length > 0 ? (
                        wellnessSummary.latest.badges.map((badge) => <span key={badge}>{badge}</span>)
                      ) : (
                        <p>No badges yet. Your greener habits will unlock them.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="student-wellness-empty">No wellness check-ins yet. Save your first one to see scores, tips, and badges.</p>
              )}
            </div>
          </div>
        )}
      </section>

      {selectedHostel && (
        <div className="student-booking-modal-backdrop" onClick={closeBookingModal}>
          <div className="student-booking-modal" onClick={(event) => event.stopPropagation()}>
          <div className="student-booking-modal-head">
            <div>
              <p className="student-section-kicker">Secure booking</p>
              <h2>{selectedHostel.name}</h2>
            </div>
              <button className="student-booking-close" type="button" onClick={closeBookingModal}>
                Close
              </button>
            </div>

            <form className="student-booking-form" onSubmit={handleBookingSubmit}>
              {bookingError && <div className="student-booking-inline-message error">{bookingError}</div>}
              {bookingSuccess && <div className="student-booking-inline-message success">{bookingSuccess}</div>}

              <div className="student-booking-summary-card">
                <span className="student-booking-summary-label">Booking summary</span>
                <h3>{selectedHostel.name}</h3>
                <p>{selectedHostel.location || selectedHostel.city || "Prime location"}</p>
                <strong>₹{getPrice(selectedHostel)} / month</strong>
                <div className="student-booking-summary-chips">
                  <span>{selectedHostel.city || "Student city"}</span>
                  <span>{getAvailabilityLabel(selectedHostel)}</span>
                  <span>{bookingForm.room_type} room</span>
                </div>
              </div>

              <div className="student-booking-steps-card">
                <span className="student-booking-summary-label">How it works</span>
                <p>1. Fill your details</p>
                <p>2. Generate OTP and enter it</p>
                <p>3. Pay with Razorpay</p>
                <p>4. Booking saves to database and becomes visible to the hostel warden</p>
                <p>Free cancellation is available for 3 days after booking. After that, extra cancellation charges apply.</p>
              </div>

              <label>
                <span>Student Name</span>
                <input name="student_name" value={bookingForm.student_name} onChange={handleBookingFieldChange} required />
              </label>

              <label>
                <span>Email</span>
                <input name="student_email" type="email" value={bookingForm.student_email} onChange={handleBookingFieldChange} required />
              </label>

              <label>
                <span>Phone Number</span>
                <input name="phone_number" value={bookingForm.phone_number} onChange={handleBookingFieldChange} required />
              </label>

              <label>
                <span>Aadhaar ID</span>
                <input name="aadhaar_id" value={bookingForm.aadhaar_id} onChange={handleBookingFieldChange} required />
              </label>

              <label>
                <span>Gender</span>
                <select name="gender" value={bookingForm.gender} onChange={handleBookingFieldChange}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                <span>Room Type</span>
                <select name="room_type" value={bookingForm.room_type} onChange={handleBookingFieldChange}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                </select>
              </label>

              <label>
                <span>Current Staying Area</span>
                <input
                  name="current_area"
                  placeholder="Example: BKT, Gomti Nagar"
                  value={bookingForm.current_area}
                  onChange={handleBookingFieldChange}
                  required
                />
              </label>

              <label>
                <span>Sleeping Time</span>
                <select name="sleeping_time" value={bookingForm.sleeping_time} onChange={handleBookingFieldChange}>
                  <option value="early">Early sleeper</option>
                  <option value="late">Late sleeper</option>
                </select>
              </label>

              <label>
                <span>Study Habit</span>
                <select name="study_habit" value={bookingForm.study_habit} onChange={handleBookingFieldChange}>
                  <option value="silent">Silent study</option>
                  <option value="balanced">Balanced</option>
                  <option value="group">Group study</option>
                </select>
              </label>

              <label>
                <span>Smoking</span>
                <select name="smoking" value={bookingForm.smoking} onChange={handleBookingFieldChange}>
                  <option value="never">Never</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                </select>
              </label>

              <label>
                <span>Drinking</span>
                <select name="drinking" value={bookingForm.drinking} onChange={handleBookingFieldChange}>
                  <option value="never">Never</option>
                  <option value="occasionally">Occasionally</option>
                  <option value="regularly">Regularly</option>
                </select>
              </label>

              <label>
                <span>Cleanliness</span>
                <select name="cleanliness" value={bookingForm.cleanliness} onChange={handleBookingFieldChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label>
                <span>ID Proof Image</span>
                <input name="id_proof" type="file" accept="image/*" onChange={handleBookingFieldChange} required />
              </label>

              <div className="student-smart-actions">
                <button
                  className="student-secondary-btn"
                  type="button"
                  onClick={handleGenerateInsights}
                  disabled={isGeneratingInsights}
                >
                  {isGeneratingInsights ? "Generating..." : "Generate Smart Match"}
                </button>
              </div>

              {smartInsights && (
                <div className="student-smart-insights-card">
                  <div className="student-smart-insight-block">
                    <span className="student-booking-summary-label">Roommate matching</span>
                    <strong>
                      {smartInsights.roommate_match?.match_found
                        ? `${smartInsights.roommate_match.name} • ${smartInsights.roommate_match.score}% match`
                        : "No live roommate match yet"}
                    </strong>
                    <p>{smartInsights.roommate_match?.summary || smartInsights.roommate_match?.message}</p>
                  </div>

                  <div className="student-smart-insight-grid">
                    <div>
                      <span>Distance from your area</span>
                      <strong>{smartInsights.commute?.distance_km} km</strong>
                      <p>{smartInsights.commute?.from_area} to {smartInsights.commute?.to_area}</p>
                    </div>
                    <div>
                      <span>Transport availability</span>
                      <strong>{smartInsights.commute?.recommended_transport}</strong>
                      <p>
                        {smartInsights.commute?.estimated_minutes} min • ₹{smartInsights.commute?.recommended_transport_cost_per_ride}/ride
                        {" "}• ₹{smartInsights.commute?.recommended_transport_monthly_cost}/month
                      </p>
                    </div>
                    <div>
                      <span>Monthly cost predictor</span>
                      <strong>₹{smartInsights.monthly_cost?.predicted_total}</strong>
                      <p>Rent + utilities + travel + monthly buffer</p>
                    </div>
                  </div>

                  {smartInsights.commute?.transport_options?.length > 0 && (
                    <div className="student-transport-chip-row">
                      {smartInsights.commute.transport_options.map((option) => (
                        <span key={`${option.mode}-${option.monthly_cost}`}>
                          {option.mode}: ₹{option.per_ride_cost}/ride, ₹{option.monthly_cost}/month
                        </span>
                      ))}
                    </div>
                  )}

                  {smartInsights.commute?.google_maps_url && (
                    <div className="student-smart-map-link">
                      <a href={smartInsights.commute.google_maps_url} target="_blank" rel="noreferrer">
                        Open commute route in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="student-otp-row">
                <label>
                  <span>OTP</span>
                  <input name="otp_code" value={bookingForm.otp_code} onChange={handleBookingFieldChange} required />
                </label>
                <button className="student-secondary-btn" type="button" onClick={handleSendOtp} disabled={isSendingOtp}>
                  {isSendingOtp ? "Sending..." : "Send OTP"}
                </button>
              </div>

              {demoOtp && <p className="student-demo-otp">Demo OTP: {demoOtp}</p>}
              <p className="student-booking-amount">Booking amount: ₹{getPrice(selectedHostel)}</p>

              <div className="student-booking-submit-row">
                <button className="student-primary-btn" type="submit" disabled={isBooking}>
                  {isBooking ? "Processing..." : "Pay With Razorpay"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <StudentFooter
        hostelsCount={hostels.length}
        wishlistCount={wishlist.length}
        filteredCount={filtered.length}
      />
    </div>
  );
}

export default StudentDashboard;

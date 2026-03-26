import { useEffect, useMemo, useState } from "react";

import "../style/booking.css";
import { readStoredUser } from "../utils/auth";

const VENUE_API_BASE = "http://localhost:8082/venues";
const EVENT_API_BASE = "http://localhost:8083/events";
const BOOKING_API_BASE = "http://localhost:8083/bookings";
function Booking() {
  const storedUser = readStoredUser();
  const isAdmin = String(storedUser?.role || "").toLowerCase() === "admin";

  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newBooking, setNewBooking] = useState({
    venueId: "",
    date: "",
  });

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");

      const [venuesRes, eventsRes, bookingsRes] = await Promise.all([
        fetch(VENUE_API_BASE),
        fetch(EVENT_API_BASE),
        fetch(BOOKING_API_BASE),
      ]);

      if (!venuesRes.ok) {
        const text = await venuesRes.text();
        throw new Error(text || "Failed to load venues");
      }
      if (!eventsRes.ok) {
        const text = await eventsRes.text();
        throw new Error(text || "Failed to load events");
      }
      if (!bookingsRes.ok) {
        const text = await bookingsRes.text();
        throw new Error(text || "Failed to load bookings");
      }

      const venuesData = await venuesRes.json();
      const eventsData = await eventsRes.json();
      const bookingsData = await bookingsRes.json();

      setVenues(Array.isArray(venuesData) ? venuesData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  const normalizeId = (b) => b?.bookingId ?? b?.id;
  const normalizeVenueId = (b) =>
    b?.venue_id ?? b?.venueId ?? b?.venue?.venueId ?? b?.venue?.id;
  const normalizeDate = (b) => b?.date ?? b?.bookingDate;
  const normalizeStatus = (b) => {
    const s = b?.status ?? b?.availability;
    if (typeof s === "boolean") return s ? "AVAILABLE" : "BOOKED";
    if (typeof s === "string" && s.trim()) return s.trim();
    return "PENDING";
  };

  const normalizeEventId = (b) =>
    b?.event_id ?? b?.eventId ?? b?.event?.id ?? b?.event?.eventId ?? null;

  const normalizeBookingCreator = (b) =>
    b?.created_by || b?.user?.name || b?.requested_by || b?.requester || "Unknown";

  const eventById = useMemo(() => {
    const map = new Map();
    events.forEach((e) => {
      const id = e?.eventId ?? e?.id;
      if (id != null) map.set(String(id), e);
    });
    return map;
  }, [events]);

  const venueNameById = useMemo(() => {
    const map = new Map();
    venues.forEach((v) => map.set(v.venueId ?? v.id, v.name));
    return map;
  }, [venues]);

  const filteredBookings = useMemo(() => {
    const term = search.toLowerCase();
    const list = bookings.filter((b) => {
      const id = String(normalizeId(b) ?? "");
      const venueId = String(normalizeVenueId(b) ?? "");
      const date = String(normalizeDate(b) ?? "");
      const status = String(normalizeStatus(b) ?? "");
      const eventObj = eventById.get(String(normalizeEventId(b)));
      const eventName = String(eventObj?.event_name ?? eventObj?.name ?? "").toLowerCase();
      const requestedBy = String(normalizeBookingCreator(b)).toLowerCase();

      return (
        id.includes(term) ||
        venueId.includes(term) ||
        date.toLowerCase().includes(term) ||
        status.toLowerCase().includes(term) ||
        eventName.includes(term) ||
        requestedBy.includes(term)
      );
    });

    if (isAdmin) return list;

    return list.filter((b) => {
      const eventObj = eventById.get(String(normalizeEventId(b)));
      return (eventObj?.created_by || "") === storedUser?.name;
    });
  }, [bookings, eventById, isAdmin, search, storedUser?.name]);

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setNewBooking((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBooking.venueId || !newBooking.date) {
      alert("Missing fields");
      return;
    }

    const venueIdNum = Number(newBooking.venueId);
    const dateStr = newBooking.date;

    // If someone already has this venue booked for this date, mark as pending in request.
    const alreadyBooked = bookings.some((b) => {
      const vId = Number(normalizeVenueId(b));
      const d = String(normalizeDate(b));
      const st = String(normalizeStatus(b)).toUpperCase();
      if (vId !== venueIdNum) return false;
      if (d !== dateStr) return false;
      return st === "BOOKED" || st === "APPROVED";
    });

    try {
      setError("");
      const res = await fetch(BOOKING_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Node booking service expects snake_case fields
          venue_id: venueIdNum,
          date: dateStr,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create booking");
      }
      setShowCreate(false);
      setNewBooking({ venueId: "", date: "" });
      await fetchAll();

      if (alreadyBooked) {
        alert("Venue already booked on this date. Your request is Pending.");
      } else {
        alert("Booking request submitted. Status: Pending.");
      }
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  const approveBooking = async (booking) => {
    if (!isAdmin) return;
    const venueId = Number(normalizeVenueId(booking));
    const date = String(normalizeDate(booking));
    const bookingId = normalizeId(booking);

    // Only approve if no other booking is already approved/booked for same venue/date
    const conflict = bookings.some((b) => {
      const bId = normalizeId(b);
      if (bookingId != null && bId === bookingId) return false;
      const vId = Number(normalizeVenueId(b));
      const d = String(normalizeDate(b));
      const st = String(normalizeStatus(b)).toUpperCase();
      if (vId !== venueId) return false;
      if (d !== date) return false;
      return st === "APPROVED" || st === "BOOKED";
    });

    if (conflict) {
      alert("This venue is not available on that date.");
      return;
    }

    try {
      setError("");
      // Node booking service: admin-only approve endpoint, controlled via header
      const res = await fetch(`${BOOKING_API_BASE}/${bookingId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-role": "admin",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to approve booking");
      }
      await fetchAll();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  return (
    <div className="Booking-page">
      <div className="Booking-header-row">
        <h2>Bookings</h2>
        <div className="Booking-header-actions">
          <input
            type="text"
            placeholder="Search bookings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={() => setShowCreate(true)}>
            + Create
          </button>
        </div>
      </div>

      {error && <div className="Booking-error">{error}</div>}
      {loading && <div className="Booking-loading">Loading...</div>}

      <section className="Booking-table-wrap">
        <table className="Booking-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Venue ID</th>
              <th>Event</th>
              <th>Date</th>
              <th>Status</th>
              <th>Requested by</th>
              <th style={{ width: 200 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="Booking-empty">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => {
                const bookingId = normalizeId(b);
                const venueId = normalizeVenueId(b);
                const date = normalizeDate(b);
                const status = normalizeStatus(b);
                const statusUpper = String(status || "PENDING").toUpperCase();
                const venueName = venueNameById.get(venueId) || "";
                const eventId = normalizeEventId(b);
                const eventObj = eventById.get(String(eventId));
                const eventName = eventObj?.event_name || eventObj?.name || "-";
                const requestedBy = normalizeBookingCreator(b);
                return (
                  <tr key={bookingId ?? `${venueId}-${date}`}>
                    <td>{bookingId ?? "-"}</td>
                    <td>
                      {venueId ?? "-"}
                      {venueName ? (
                        <span className="Booking-venueName"> — {venueName}</span>
                      ) : null}
                    </td>
                    <td>{eventName}</td>
                    <td>{date ?? "-"}</td>
                    <td>
                      <span
                        className={`Booking-status Booking-status--${String(
                          status
                        ).toLowerCase()}`}
                      >
                        {statusUpper}
                      </span>
                    </td>
                    <td>{requestedBy}</td>
                    <td>
                      <div className="Booking-actions">
                        {isAdmin ? (
                          statusUpper === "PENDING" ? (
                            <button
                              type="button"
                              className="Booking-action-btn"
                              onClick={() => approveBooking(b)}
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="Booking-actions--readonly">—</span>
                          )
                        ) : (
                          <span className="Booking-actions--readonly">
                            {statusUpper === "PENDING" ? "Pending" : statusUpper}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {showCreate && (
        <div className="Booking-modal-backdrop">
          <div className="Booking-modal">
            <h3>Create Booking</h3>
            <form onSubmit={handleCreate} className="Booking-form">
              <label>
                Venue
                <select
                  name="venueId"
                  value={newBooking.venueId}
                  onChange={handleCreateChange}
                >
                  <option value="">Select venue</option>
                  {venues.map((v) => (
                    <option key={v.venueId} value={v.venueId}>
                      {v.venueId} — {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={newBooking.date}
                  onChange={handleCreateChange}
                />
              </label>
              <div className="Booking-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewBooking({ venueId: "", date: "" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit">Submit</button>
              </div>
            </form>
            <p className="Booking-note">
              If a venue is already booked for the selected date, your booking
              will be marked as <strong>Pending</strong>.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
export default Booking;
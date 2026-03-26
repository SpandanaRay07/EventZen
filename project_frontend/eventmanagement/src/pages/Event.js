import { useCallback, useEffect, useMemo, useState } from "react";

import "../style/events.css";
import { readStoredUser } from "../utils/auth";
import { asBoolean, toMysqlDateOnly, todayYMD } from "../utils/normalize";

const EVENT_API_BASE = "http://localhost:8083/events";
const VENUE_API_BASE = "http://localhost:8082/venues";
const VENDOR_API_BASE = "http://localhost:8082/vendors";
const ATTENDEE_REQUEST_API_BASE = "http://localhost:8083/attendee_requests";

function normalizeEventVendorIds(ev) {
  const list =
    ev?.vendor_ids ??
    ev?.vendorIds ??
    ev?.vendor_id_list ??
    ev?.vendorIdList ??
    ev?.vendors;
  if (Array.isArray(list)) {
    return list
      .map((item) => {
        if (item == null) return NaN;
        if (typeof item === "object") return Number(item.vendorId ?? item.id ?? item.vendor_id);
        return Number(item);
      })
      .filter((n) => !Number.isNaN(n));
  }
  if (ev?.vendor_id != null && ev.vendor_id !== "") {
    const n = Number(ev.vendor_id);
    return Number.isNaN(n) ? [] : [n];
  }
  return [];
}

function formatVendorLabels(ids, vendorNameById) {
  if (!ids?.length) return "-";
  return ids
    .map((id) => {
      const name = vendorNameById.get(Number(id));
      return name ? `${name} (#${id})` : `#${id}`;
    })
    .join(", ");
}

function Event() {
  const storedUser = readStoredUser();

  const isLoggedIn = Boolean(storedUser?.name);
  const isAttendeeRole = String(storedUser?.role || "").toLowerCase() === "attendee";

  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [form, setForm] = useState({
    event_name: "",
    venue_id: "",
    vendor_ids: [],
    date: "",
    create_booking: true,
    allow_attendee_request: true,
  });
  const [attendees, setAttendees] = useState([{ name: "", email: "" }]);

  const selectedVenue = useMemo(() => {
    const id = Number(form.venue_id);
    return venues.find((v) => Number(v.venueId ?? v.id) === id) || null;
  }, [form.venue_id, venues]);
  const venueCapacity = Number(selectedVenue?.capacity ?? 0);

  const normalizedAttendees = attendees
    .map((a) => ({ name: a.name?.trim(), email: a.email?.trim() }))
    .filter((a) => a.name || a.email);

  const fetchDropdowns = useCallback(async () => {
    const [venueRes, vendorRes] = await Promise.all([
      fetch(VENUE_API_BASE),
      fetch(VENDOR_API_BASE),
    ]);
    if (!venueRes.ok) throw new Error((await venueRes.text()) || "Failed to load venues");
    if (!vendorRes.ok) throw new Error((await vendorRes.text()) || "Failed to load vendors");
    const venueData = await venueRes.json();
    const vendorData = await vendorRes.json();
    setVenues(Array.isArray(venueData) ? venueData : []);
    setVendors(Array.isArray(vendorData) ? vendorData : []);
  }, []);

  const fetchEvents = useCallback(async () => {
    const res = await fetch(EVENT_API_BASE);
    if (!res.ok) throw new Error((await res.text()) || "Failed to load events");
    const data = await res.json();
    setEvents(Array.isArray(data) ? data : []);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      await Promise.all([fetchDropdowns(), fetchEvents()]);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [fetchDropdowns, fetchEvents]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const venueNameById = useMemo(() => {
    const map = new Map();
    venues.forEach((v) => map.set(Number(v.venueId ?? v.id), v.name));
    return map;
  }, [venues]);

  const vendorNameById = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => map.set(Number(v.vendorId ?? v.id), v.name));
    return map;
  }, [vendors]);

  const filteredEvents = useMemo(() => {
    const term = search.toLowerCase();
    return events.filter((e) => {
      const id = String(e?.id ?? "");
      const name = String(e?.event_name ?? "").toLowerCase();
      const createdBy = String(e?.created_by ?? "").toLowerCase();
      const venueId = String(e?.venue_id ?? "");
      const vendorIdsStr = normalizeEventVendorIds(e).join(" ");
      const date = String(e?.date ?? "").toLowerCase();
      return (
        id.includes(term) ||
        name.includes(term) ||
        createdBy.includes(term) ||
        venueId.includes(term) ||
        vendorIdsStr.includes(term) ||
        date.includes(term)
      );
    });
  }, [events, search]);

  const yourEvents = useMemo(() => {
    if (!storedUser?.name) return [];
    return filteredEvents.filter((ev) => ev?.created_by === storedUser.name);
  }, [filteredEvents, storedUser?.name]);

  const otherEvents = useMemo(() => {
    if (!storedUser?.name) return filteredEvents;
    return filteredEvents.filter((ev) => ev?.created_by !== storedUser.name);
  }, [filteredEvents, storedUser?.name]);

  const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const updateAttendee = (idx, patch) =>
    setAttendees((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  const addAttendee = () => {
    if (venueCapacity && attendees.length >= venueCapacity) {
      alert(`Max attendees for this venue is ${venueCapacity}`);
      return;
    }
    setAttendees((prev) => [...prev, { name: "", email: "" }]);
  };
  const removeAttendee = (idx) =>
    setAttendees((prev) => prev.filter((_, i) => i !== idx));

  const vendorIdsAsNumbers = (ids) =>
    (ids || [])
      .map((x) => Number(x))
      .filter((n) => !Number.isNaN(n));

  const addFormVendor = (rawId) => {
    const s = String(rawId);
    if (!s || s === "") return;
    setForm((p) => {
      if (p.vendor_ids.includes(s)) return p;
      return { ...p, vendor_ids: [...p.vendor_ids, s] };
    });
  };

  const removeFormVendor = (rawId) => {
    const s = String(rawId);
    setForm((p) => ({ ...p, vendor_ids: p.vendor_ids.filter((id) => id !== s) }));
  };

  const isOwner = (ev) =>
    Boolean(storedUser?.name && ev?.created_by && ev.created_by === storedUser.name);

  const isAttendeeRequestAllowed = (ev) =>
    asBoolean(ev?.allow_attendee_request ?? ev?.allowAttendeeRequest ?? ev?.allow_attendee_requests);

  const requestAttend = async (eventId) => {
    if (!storedUser?.name) {
      alert("Please login to request to attend.");
      return;
    }
    if (!eventId) {
      alert("Invalid event.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const res = await fetch(ATTENDEE_REQUEST_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: storedUser.name,
          email: storedUser.email,
          role: "participant",
          event_id: eventId,
          date: todayYMD(),
        }),
      });

      if (!res.ok) throw new Error((await res.text()) || "Failed to submit request");
      const data = await res.json().catch(() => null);
      alert(data?.message || "Request submitted successfully.");
    } catch (e) {
      console.error(e);
      setError(e.message);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    if (isAttendeeRole) return;
    setForm({
      event_name: "",
      venue_id: "",
      vendor_ids: [],
      date: "",
      create_booking: true,
      allow_attendee_request: true,
    });
    setAttendees([{ name: "", email: "" }]);
    setShowCreate(true);
  };

  const openUpdate = (ev) => {
    setUpdatingId(ev?.id);
    setForm({
      event_name: ev?.event_name ?? "",
      venue_id: String(ev?.venue_id ?? ""),
      vendor_ids: normalizeEventVendorIds(ev).map(String),
      date: toMysqlDateOnly(ev?.date ?? ""),
      create_booking: false,
      allow_attendee_request: asBoolean(
        ev?.allow_attendee_request ?? ev?.allowAttendeeRequest
      ),
    });
    setAttendees([{ name: "", email: "" }]);
    setShowUpdate(true);
  };

  const createEvent = async (e) => {
    e.preventDefault();
    if (isAttendeeRole) return;
    if (!form.event_name.trim() || !form.venue_id || !form.date) {
      alert("Missing fields");
      return;
    }
    if (venueCapacity && normalizedAttendees.length > venueCapacity) {
      alert(`Attendees exceed venue capacity (${venueCapacity})`);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const vIds = vendorIdsAsNumbers(form.vendor_ids);
      const payload = {
        event_name: form.event_name.trim(),
        created_by: storedUser?.name || "User",
        venue_id: Number(form.venue_id),
        vendor_ids: vIds,
        vendor_id: vIds[0],
        date: toMysqlDateOnly(form.date),
        attendees: normalizedAttendees,
        create_booking: Boolean(form.create_booking),
        allow_attendee_request: Boolean(form.allow_attendee_request),
        allowAttendeeRequest: Boolean(form.allow_attendee_request),
      };
      const res = await fetch(EVENT_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create event");
      const data = await res.json().catch(() => null);
      alert(data?.message || "Event created");
      setShowCreate(false);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateEvent = async (e) => {
    e.preventDefault();
    if (isAttendeeRole) return;
    if (!updatingId) return;
    if (!form.event_name.trim() || !form.venue_id || !form.date) {
      alert("Missing fields");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const vIds = vendorIdsAsNumbers(form.vendor_ids);
      const payload = {
        event_name: form.event_name.trim(),
        created_by: storedUser?.name || undefined,
        venue_id: Number(form.venue_id),
        vendor_ids: vIds,
        vendor_id: vIds.length ? vIds[0] : null,
        date: toMysqlDateOnly(form.date),
        allow_attendee_request: Boolean(form.allow_attendee_request),
        allowAttendeeRequest: Boolean(form.allow_attendee_request),
      };
      const res = await fetch(`${EVENT_API_BASE}/${updatingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to update event");
      alert("Event updated");
      setShowUpdate(false);
      setUpdatingId(null);
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id) => {
    if (isAttendeeRole) return;
    if (!window.confirm("Delete this event?")) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${EVENT_API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete event");
      await fetchEvents();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Event-page">
      <div className="Event-header-row">
        <h2>Events</h2>
        <div className="Event-header-actions">
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/*"+ Create" button if logged in */}
          {isLoggedIn && !isAttendeeRole && (
            <button type="button" onClick={openCreate}>
              + Create
            </button>
          )}
        </div>
      </div>

      {error && <div className="Event-error">{error}</div>}
      {loading && <div className="Event-loading">Loading...</div>}

      <section className="Event-gallery-wrap">
        {/*"Your Events" section if logged in */}
        {isLoggedIn && !isAttendeeRole && (
          <div className="Event-section">
            <h3>Your Events</h3>
            {yourEvents.length === 0 && !loading ? (
              <div className="Event-empty">No events found for you.</div>
            ) : (
              <div className="Event-gallery">
                {yourEvents.map((ev) => (
                  <article key={`your-${ev.id}`} className="Event-card">
                    <div className="Event-card-title-row">
                      <h3 className="Event-card-title">{ev.event_name}</h3>
                      <div className="Event-card-id">ID {ev.id}</div>
                    </div>

                    <div className="Event-card-meta">
                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Created</span>
                        <span className="Event-meta-value">{ev.created_by || "-"}</span>
                      </div>

                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Venue</span>
                        <span className="Event-meta-value">
                          {ev.venue_id ?? "-"}
                          {venueNameById.get(Number(ev.venue_id)) ? (
                            <> — {venueNameById.get(Number(ev.venue_id))}</>
                          ) : null}
                        </span>
                      </div>

                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Vendors</span>
                        <span className="Event-meta-value Event-meta-value--wrap">
                          {formatVendorLabels(normalizeEventVendorIds(ev), vendorNameById)}
                        </span>
                      </div>

                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Date</span>
                        <span className="Event-meta-value">
                          {toMysqlDateOnly(ev?.date) || ev?.date || "-"}
                        </span>
                      </div>

                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Attendees</span>
                        <span className="Event-meta-value">{ev.attendees_count ?? 0}</span>
                      </div>

                      <div className="Event-meta-row">
                        <span className="Event-meta-label">Attendee requests</span>
                        <span className="Event-meta-value">
                          {isAttendeeRequestAllowed(ev) ? "Allowed" : "Disabled"}
                        </span>
                      </div>
                    </div>

                    <div className="Event-actions">
                      <button
                        type="button"
                        className="Event-action-btn"
                        onClick={() => openUpdate(ev)}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="Event-action-btn Event-action-btn--danger"
                        onClick={() => deleteEvent(ev.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="Event-section">
          <h3>{isAttendeeRole ? "All Events" : "Other Events"}</h3>
          {otherEvents.length === 0 && !loading ? (
            <div className="Event-empty">No events found.</div>
          ) : (
            <div className="Event-gallery">
              {otherEvents.map((ev) => (
                <article key={`other-${ev.id}`} className="Event-card">
                  <div className="Event-card-title-row">
                    <h3 className="Event-card-title">{ev.event_name}</h3>
                    <div className="Event-card-id">ID {ev.id}</div>
                  </div>

                  <div className="Event-card-meta">
                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Created</span>
                      <span className="Event-meta-value">{ev.created_by || "-"}</span>
                    </div>

                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Venue</span>
                      <span className="Event-meta-value">
                        {ev.venue_id ?? "-"}
                        {venueNameById.get(Number(ev.venue_id)) ? (
                          <> — {venueNameById.get(Number(ev.venue_id))}</>
                        ) : null}
                      </span>
                    </div>

                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Vendors</span>
                      <span className="Event-meta-value Event-meta-value--wrap">
                        {formatVendorLabels(normalizeEventVendorIds(ev), vendorNameById)}
                      </span>
                    </div>

                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Date</span>
                      <span className="Event-meta-value">
                        {toMysqlDateOnly(ev?.date) || ev?.date || "-"}
                      </span>
                    </div>

                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Attendees</span>
                      <span className="Event-meta-value">{ev.attendees_count ?? 0}</span>
                    </div>

                    <div className="Event-meta-row">
                      <span className="Event-meta-label">Attendee requests</span>
                      <span className="Event-meta-value">
                        {isAttendeeRequestAllowed(ev) ? "Allowed" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  <div className="Event-actions">
                    {isOwner(ev) ? (
                      <>
                        <button
                          type="button"
                          className="Event-action-btn"
                          onClick={() => openUpdate(ev)}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="Event-action-btn Event-action-btn--danger"
                          onClick={() => deleteEvent(ev.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : isLoggedIn && isAttendeeRequestAllowed(ev) ? (
                      <button
                        type="button"
                        className="Event-action-btn"
                        onClick={() => requestAttend(ev.id)}
                      >
                        Request to join
                      </button>
                    ) : isLoggedIn ? (
                      <span className="Event-action-text">Request disabled</span>
                    ) : null }
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {showCreate && (
        <div className="Event-modal-backdrop">
          <div className="Event-modal">
            <h3>Create Event</h3>
            <form onSubmit={createEvent} className="Event-form">
              <label>
                Event Name *
                <input
                  type="text"
                  value={form.event_name}
                  onChange={(e) => setField("event_name", e.target.value)}
                />
              </label>

              <div className="Event-row">
                <label>
                  Venue *
                  <select
                    value={form.venue_id}
                    onChange={(e) => setField("venue_id", e.target.value)}
                  >
                    <option value="">Select venue</option>
                    {venues.map((v) => {
                      const id = v.venueId ?? v.id;
                      return (
                        <option key={id} value={id}>
                          {v.name} (cap: {v.capacity})
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <div className="Event-vendors-field">
                <span>Vendors (optional, multiple)</span>
                <div className="Event-vendor-chips">
                  {form.vendor_ids.length === 0 ? (
                    <span style={{ color: "var(--white-muted)", fontSize: 13 }}>None selected</span>
                  ) : (
                    form.vendor_ids.map((vid) => (
                      <span key={vid} className="Event-vendor-chip">
                        {vendorNameById.get(Number(vid)) || "Vendor"} (#{vid})
                        <button type="button" onClick={() => removeFormVendor(vid)}>
                          Remove
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <select
                  className="Event-vendor-add-select"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      addFormVendor(v);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">+ Add vendor…</option>
                  {vendors
                    .filter((v) => !form.vendor_ids.includes(String(v.vendorId ?? v.id)))
                    .map((v) => {
                      const id = String(v.vendorId ?? v.id);
                      return (
                        <option key={id} value={id}>
                          {id} — {v.name}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="Event-row">
                <label>
                  Date *
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                  />
                </label>

                <label className="Event-checkbox">
                  <input
                    type="checkbox"
                    checked={form.create_booking}
                    onChange={(e) => setField("create_booking", e.target.checked)}
                  />
                  Book venue for this date
                </label>

                <label className="Event-checkbox">
                  <input
                    type="checkbox"
                    checked={form.allow_attendee_request}
                    onChange={(e) => setField("allow_attendee_request", e.target.checked)}
                  />
                  Allow attendee request
                </label>
              </div>

              <div className="Event-attendees">
                <div className="Event-attendees-header">
                  <h3>Attendees</h3>
                  <div className="Event-attendees-meta">
                    {venueCapacity ? (
                      <span>
                        Max: <strong>{venueCapacity}</strong> | Added:{" "}
                        <strong>{normalizedAttendees.length}</strong>
                      </span>
                    ) : (
                      <span>Select a venue to see capacity</span>
                    )}
                  </div>
                </div>

                {attendees.map((a, idx) => (
                  <div key={idx} className="Event-attendee-row">
                    <input
                      type="text"
                      value={a.name}
                      placeholder="Name"
                      onChange={(e) => updateAttendee(idx, { name: e.target.value })}
                    />
                    <input
                      type="email"
                      value={a.email}
                      placeholder="Email"
                      onChange={(e) => updateAttendee(idx, { email: e.target.value })}
                    />
                    <button
                      type="button"
                      className="Event-attendee-remove"
                      onClick={() => removeAttendee(idx)}
                      disabled={attendees.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <button type="button" className="Event-attendee-add" onClick={addAttendee}>
                  + Add attendee
                </button>
              </div>

              <div className="Event-form-actions">
                <button type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUpdate && (
        <div className="Event-modal-backdrop">
          <div className="Event-modal">
            <h3>Update Event</h3>
            <form onSubmit={updateEvent} className="Event-form">
              <label>
                Event Name *
                <input
                  type="text"
                  value={form.event_name}
                  onChange={(e) => setField("event_name", e.target.value)}
                />
              </label>

              <div className="Event-row">
                <label>
                  Venue *
                  <select
                    value={form.venue_id}
                    onChange={(e) => setField("venue_id", e.target.value)}
                  >
                    <option value="">Select venue</option>
                    {venues.map((v) => {
                      const id = v.venueId ?? v.id;
                      return (
                        <option key={id} value={id}>
                          {id} — {v.name}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </div>

              <div className="Event-vendors-field">
                <span>Vendors (optional, multiple)</span>
                <div className="Event-vendor-chips">
                  {form.vendor_ids.length === 0 ? (
                    <span style={{ color: "var(--white-muted)", fontSize: 13 }}>None selected</span>
                  ) : (
                    form.vendor_ids.map((vid) => (
                      <span key={vid} className="Event-vendor-chip">
                        {vendorNameById.get(Number(vid)) || "Vendor"} (#{vid})
                        <button type="button" onClick={() => removeFormVendor(vid)}>
                          Remove
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <select
                  className="Event-vendor-add-select"
                  defaultValue=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) {
                      addFormVendor(v);
                      e.target.value = "";
                    }
                  }}
                >
                  <option value="">+ Add vendor…</option>
                  {vendors
                    .filter((v) => !form.vendor_ids.includes(String(v.vendorId ?? v.id)))
                    .map((v) => {
                      const id = String(v.vendorId ?? v.id);
                      return (
                        <option key={id} value={id}>
                          {id} — {v.name}
                        </option>
                      );
                    })}
                </select>
              </div>

              <label>
                Date *
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                />
              </label>

              <label className="Event-checkbox">
                <input
                  type="checkbox"
                  checked={form.allow_attendee_request}
                  onChange={(e) => setField("allow_attendee_request", e.target.checked)}
                />
                Allow attendee request
              </label>

              <div className="Event-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowUpdate(false);
                    setUpdatingId(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Event;
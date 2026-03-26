import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../style/attendee.css";
import { readStoredUser } from "../utils/auth";

const EVENT_API_BASE = "http://localhost:8083/events";
const ATTENDEE_REQUEST_API_BASE = "http://localhost:8083/attendee_requests";
const ATTENDEE_API_BASE = "http://localhost:8083/attendees";

function toUpperStatus(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.toUpperCase().trim();
  return String(value).toUpperCase().trim();
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function normalizeRequestId(r) {
  return r?.id ?? r?.request_id ?? r?.requestId ?? r?.attendee_request_id ?? null;
}

function normalizeEventId(r) {
  return r?.event_id ?? r?.eventId ?? r?.event?.id ?? r?.event?.eventId ?? null;
}

function normalizeRequestedBy(r) {
  return (
    r?.requested_by ??
    r?.requestedBy ??
    r?.requester ??
    r?.requested_by_name ??
    r?.user?.name ??
    r?.name ??
    ""
  );
}

function normalizeRequestedByEmail(r) {
  return r?.requested_by_email ?? r?.requestedByEmail ?? r?.email ?? r?.user?.email ?? "";
}

function normalizeStatus(r) {
  return r?.status ?? r?.approval_status ?? r?.state ?? "PENDING";
}

function Attendee() {
  const navigate = useNavigate();
  const storedUser = readStoredUser();

  const isAdmin = storedUser?.role === "admin";
  const isLoggedIn = Boolean(storedUser?.name);

  useEffect(() => {
    if (!isLoggedIn) navigate("/login");
  }, [isLoggedIn, navigate]);

  const [events, setEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [eventsRes, reqRes, attRes] = await Promise.all([fetch(EVENT_API_BASE), fetch(ATTENDEE_REQUEST_API_BASE), fetch(ATTENDEE_API_BASE)]);

      if (!eventsRes.ok) throw new Error((await eventsRes.text()) || "Failed to load events");
      if (!reqRes.ok) throw new Error((await reqRes.text()) || "Failed to load attendee requests");
      if (!attRes.ok) throw new Error((await attRes.text()) || "Failed to load attendees");

      const [eventsData, reqData, attData] = await Promise.all([eventsRes.json(), reqRes.json(), attRes.json()]);

      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setAttendees(Array.isArray(attData) ? attData : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to load attendee requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const eventById = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const id = ev?.id ?? ev?.eventId;
      if (id != null) map.set(String(id), ev);
    });
    return map;
  }, [events]);

  const visibleRequests = useMemo(() => {
    const term = search.toLowerCase();

    const baseList = requests.filter((r) => {
      const reqEventId = normalizeEventId(r);
      const ev = reqEventId != null ? eventById.get(String(reqEventId)) : null;

      if (!isAdmin) {
        // Users can only see attendee requests for their own created events
        if (!ev || ev?.created_by !== storedUser?.name) return false;
      }

      if (!term) return true;

      const requestId = String(normalizeRequestId(r) ?? "");
      const eventName = String(ev?.event_name ?? ev?.name ?? "");
      const requestedBy = String(normalizeRequestedBy(r));
      const requestedByEmail = String(normalizeRequestedByEmail(r));
      const statusUpper = toUpperStatus(normalizeStatus(r));

      return (
        requestId.toLowerCase().includes(term) ||
        eventName.toLowerCase().includes(term) ||
        requestedBy.toLowerCase().includes(term) ||
        requestedByEmail.toLowerCase().includes(term) ||
        statusUpper.toLowerCase().includes(term)
      );
    });

    return baseList;
  }, [
    requests,
    search,
    isAdmin,
    eventById,
    storedUser?.name,
  ]);

  const groupedData = useMemo(() => {
    const map = new Map();

    attendees.forEach((a) => {
      const eventId = a.event_id;
      if (!map.has(eventId)) map.set(eventId, { event: eventById.get(String(eventId)), attendees: [], requests: [] });
      map.get(eventId).attendees.push(a);
    });

    visibleRequests.forEach((r) => {
      const eventId = normalizeEventId(r);
      if (!map.has(eventId)) map.set(eventId, { event: eventById.get(String(eventId)), attendees: [], requests: [] });
      map.get(eventId).requests.push(r);
    });

    return Array.from(map.values()).filter(({ event }) => event && (event.created_by === storedUser?.name || isAdmin));
  }, [attendees, visibleRequests, eventById, storedUser?.name, isAdmin]);

  const approveRequest = async (requestId, event) => {
    if (!isAdmin && storedUser?.name !== event.created_by) return;
    try {
      setError("");
      setLoading(true);

      // Controller supports status update; use it directly.
      let res = await fetch(`${ATTENDEE_REQUEST_API_BASE}/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      });

      // Optional fallback for route styles like /:id/accept
      if (!res.ok) {
        res = await fetch(`${ATTENDEE_REQUEST_API_BASE}/${requestId}/accept`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!res.ok) throw new Error((await res.text()) || "Failed to approve request");
      await fetchAll();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to approve request");
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (requestId) => {
    if (!isAdmin) return;
    try {
      setError("");
      setLoading(true);

      // Controller supports status update; use it directly.
      let res = await fetch(`${ATTENDEE_REQUEST_API_BASE}/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      // Optional fallback for route styles like /:id/reject
      if (!res.ok) {
        res = await fetch(`${ATTENDEE_REQUEST_API_BASE}/${requestId}/reject`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!res.ok) throw new Error((await res.text()) || "Failed to reject request");
      await fetchAll();
    } catch (e) {
      console.error(e);
      setError(e.message || "Failed to reject request");
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Attendee-page">
      <div className="Attendee-header-row">
        <h2>Attendees & Requests</h2>
        <div className="Attendee-header-actions">
          <input
            type="text"
            className="Attendee-search"
            placeholder="Search by name, email, or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? <div className="Attendee-error">{error}</div> : null}
      {loading ? <div className="Attendee-loading">Loading...</div> : null}

      <section className="Attendee-table-wrap">
        {groupedData.length === 0 && !loading ? (
          <div className="Attendee-empty">No events with attendees or requests found.</div>
        ) : (
          groupedData.map(({ event, attendees: eventAttendees, requests: eventRequests }) => (
            <div key={event.id} className="Attendee-event-section">
              <h3 className="Attendee-event-title">{event.event_name}</h3>
              <div className="Attendee-event-date">{formatDate(event.date)}</div>

              {eventAttendees.length > 0 && (
                <div className="Attendee-subsection">
                  <h4>Attendees</h4>
                  <table className="Attendee-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventAttendees.map((a, idx) => (
                        <tr key={idx}>
                          <td>{a.name || "-"}</td>
                          <td>{a.email || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {eventRequests.length > 0 && (
                <div className="Attendee-subsection">
                  <h4>Attendee Requests</h4>
                  <table className="Attendee-table">
                    <thead>
                      <tr>
                        <th>Request</th>
                        <th>Attendee</th>
                        <th>Status</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRequests.map((r) => {
                        const requestId = normalizeRequestId(r);
                        const requestedBy = normalizeRequestedBy(r);
                        const requestedByEmail = normalizeRequestedByEmail(r);
                        const statusUpper = toUpperStatus(normalizeStatus(r));

                        return (
                          <tr key={requestId ?? `${event.id}-${requestedBy}`}>
                            <td>{requestId ?? "-"}</td>
                            <td>
                              <div>{requestedBy || "-"}</div>
                              {requestedByEmail ? <div className="Attendee-muted">{requestedByEmail}</div> : null}
                            </td>
                            <td>
                              <span className={`Attendee-status Attendee-status--${statusUpper.toLowerCase() || "pending"}`}>
                                {statusUpper || "PENDING"}
                              </span>
                            </td>
                            <td>
                              <div className="Attendee-actions">
                                {(isAdmin || storedUser?.name === event.created_by) ? (
                                  statusUpper === "PENDING" ? (
                                    <>
                                      <button
                                        type="button"
                                        className="Attendee-action-btn"
                                        onClick={() => approveRequest(requestId, event)}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        className="Attendee-action-btn Attendee-action-btn--danger"
                                        onClick={() => rejectRequest(requestId)}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  ) : (
                                    <span className="Attendee-actions--readonly">—</span>
                                  )
                                ) : (
                                  <span className="Attendee-actions--readonly">{statusUpper}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default Attendee;


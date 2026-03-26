import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../style/explore.css";
import { readStoredUser } from "../utils/auth";
import { asBoolean, toMysqlDateOnly } from "../utils/normalize";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

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
  if (!ids?.length) return "Vendors: —";
  const names = ids
    .map((id) => {
      const name = vendorNameById.get(Number(id));
      return name || `#${id}`;
    })
    .join(", ");
  return `Vendors: ${names}`;
}

const EVENT_API_BASE = "http://localhost:8083/events";
const VENUE_API_BASE = "http://localhost:8082/venues";
const VENDOR_API_BASE = "http://localhost:8082/vendors";
const ATTENDEE_REQUEST_API_BASE = "http://localhost:8083/attendee_requests";

function ExploreEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [venues, setVenues] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [userRequests, setUserRequests] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const user = readStoredUser();
      const requests = user?.name ? [fetch(ATTENDEE_REQUEST_API_BASE)] : [];
      const [evRes, vRes, vendRes, ...reqRes] = await Promise.all([fetch(EVENT_API_BASE), fetch(VENUE_API_BASE), fetch(VENDOR_API_BASE), ...requests]);
      
      if (!evRes.ok) throw new Error((await evRes.text()) || "Failed to load events");
      if (!vRes.ok) throw new Error((await vRes.text()) || "Failed to load venues");
      if (!vendRes.ok) throw new Error((await vendRes.text()) || "Failed to load vendors");
      
      const results = await Promise.all([evRes.json(), vRes.json(), vendRes.json(), ...(reqRes.length ? [reqRes[0].json()] : [Promise.resolve([])])]);
      const [evData, vData, vendData, reqData] = results;
      
      setEvents(Array.isArray(evData) ? evData : []);
      setVenues(Array.isArray(vData) ? vData : []);
      setVendors(Array.isArray(vendData) ? vendData : []);
      setUserRequests(Array.isArray(reqData) ? reqData : []);
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return events.filter((e) => {
      const name = String(e?.event_name ?? "").toLowerCase();
      const id = String(e?.id ?? "");
      const date = String(e?.date ?? "").toLowerCase();
      return name.includes(term) || id.includes(term) || date.includes(term);
    });
  }, [events, search]);

  const isJoinAllowed = (ev) =>
    asBoolean(ev?.allow_attendee_request ?? ev?.allowAttendeeRequest);

  const loginNext = encodeURIComponent("/home/events");

  const handleRequestJoin = async (ev) => {
    const user = readStoredUser();
    if (!user?.name) {
      navigate(`/login?next=${loginNext}`);
      return;
    }

    const eventId = ev?.id ?? ev?.eventId;
    if (!eventId) {
      alert("Invalid event.");
      return;
    }

    // Check if user has already requested to join this event
    const existingRequest = userRequests.find(req => 
      (req.event_id === eventId || req.eventId === eventId) && 
      (req.requested_by === user.name || req.name === user.name || req.email === user.email)
    );

    if (existingRequest) {
      alert("You have already requested to join this event.");
      return;
    }

    try {
      setError("");
      setLoading(true);
      const res = await fetch(ATTENDEE_REQUEST_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: "participant",
          event_id: eventId,
          date: toMysqlDateOnly(ev?.date ?? ""),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to submit request");
      const data = await res.json().catch(() => null);
      alert(data?.message || "Request submitted successfully.");
      // Reload to update the requests
      load();
    } catch (e) {
      console.error(e);
      setError(e.message);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="Explore-page">
      <div className="Explore-header">
        <div>
          <h1 className="Explore-title">Explore events</h1>
          <p className="Explore-sub">
            Browse public events. If the host allows joins, sign in to request a spot.
          </p>
        </div>
        <div className="Explore-header-actions">
          <input
            type="search"
            className="Explore-search"
            placeholder="Search by name, date, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Link to="/landing" className="Explore-link-back">
            ← Back to home
          </Link>
        </div>
      </div>

      {error ? <div className="Explore-error">{error}</div> : null}
      {loading && !events.length ? <div className="Explore-loading">Loading events…</div> : null}

      <div className="Explore-grid">
        {filtered.length === 0 && !loading ? (
          <p className="Explore-empty">No events to show yet.</p>
        ) : (
          filtered.map((ev) => {
            const id = ev?.id ?? ev?.eventId;
            const joinOk = isJoinAllowed(ev);
            return (
              <article key={id} className="Explore-card">
                <h2 className="Explore-card-title">{ev?.event_name || "Untitled event"}</h2>
                <div className="Explore-card-meta">
                  <span>ID {id ?? "—"} </span>
                  <span>{formatDate(ev?.date)}</span>
                  <span>
                    {ev?.venue_id != null && venueNameById.get(Number(ev.venue_id))
                      ? venueNameById.get(Number(ev.venue_id))
                      : ev?.venue_id != null
                        ? `Venue #${ev.venue_id}`
                        : "Venue —"}
                  </span>
                  <span>
                    {formatVendorLabels(normalizeEventVendorIds(ev), vendorNameById)}
                  </span>
                </div>
                <div className="Explore-card-footer">
                  {joinOk ? (
                    (() => {
                      const user = readStoredUser();
                      const existingRequest = user?.name && userRequests.find(req => 
                        (req.event_id === id || req.eventId === id) && 
                        (req.requested_by === user.name || req.name === user.name || req.email === user.email)
                      );
                      
                      return existingRequest ? (
                        <span className="Explore-join-pending">Request pending</span>
                      ) : (
                        <button
                          type="button"
                          className="Explore-btn-join"
                          onClick={() => handleRequestJoin(ev)}
                          disabled={loading}
                        >
                          Request to join
                        </button>
                      );
                    })()
                  ) : (
                    <span className="Explore-join-off">Join not open for this event</span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ExploreEvents;

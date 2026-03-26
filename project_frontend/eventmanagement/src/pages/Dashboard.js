import { useEffect, useMemo, useState } from "react";

import "../style/dashboard.css";

const VENUE_API_BASE = "http://localhost:8082/venues";
const EVENT_API_BASE = "http://localhost:8083/events";
const BOOKING_API_BASE = "http://localhost:8083/bookings";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(d) {
  // YYYY-MM (stable sort)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d) {
  return `${MONTHS[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
}

function Dashboard() {
  const [data, setData] = useState({ venues: [], events: [], bookings: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError("");

        const [venuesRes, eventsRes, bookingsRes] = await Promise.all([
          fetch(VENUE_API_BASE),
          fetch(EVENT_API_BASE),
          fetch(BOOKING_API_BASE)
        ]);

        if (!venuesRes.ok) throw new Error((await venuesRes.text()) || "Failed to load venues");
        if (!eventsRes.ok) throw new Error((await eventsRes.text()) || "Failed to load events");
        if (!bookingsRes.ok) throw new Error((await bookingsRes.text()) || "Failed to load bookings");

        const [venuesData, eventsData, bookingsData] = await Promise.all([
          venuesRes.json(),
          eventsRes.json(),
          bookingsRes.json()
        ]);

        setData({
          venues: Array.isArray(venuesData) ? venuesData : [],
          events: Array.isArray(eventsData) ? eventsData : [],
          bookings: Array.isArray(bookingsData) ? bookingsData : []
        });
      } catch (e) {
        setError(e.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const totalVenues = data.venues.length;
  const totalEvents = data.events.length;
  const totalBookings = data.bookings.length;

  const eventsChart = useMemo(() => {
    if (!data.events.length) {
      return {
        months: [],
        counts: [],
        max: 0,
        avg: 0
      };
    }

    const countsByMonth = new Map();
    let minMonth = null;
    let maxMonth = null;

    data.events.forEach((e) => {
      const d = parseDate(e?.date ?? e?.event_date ?? e?.eventDate);
      if (!d) return;

      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const key = monthKey(start);
      countsByMonth.set(key, (countsByMonth.get(key) || 0) + 1);

      if (!minMonth || start < minMonth) minMonth = start;
      if (!maxMonth || start > maxMonth) maxMonth = start;
    });

    if (!minMonth || !maxMonth) {
      return { months: [], counts: [], max: 0, avg: 0 };
    }

    const months = [];
    const cursor = new Date(minMonth.getTime());
    const end = new Date(maxMonth.getTime());

    while (cursor <= end) {
      months.push(new Date(cursor.getTime()));
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Keep it tidy: last 6 months
    const trimmed = months.length > 6 ? months.slice(-6) : months;
    const counts = trimmed.map((m) => countsByMonth.get(monthKey(m)) || 0);
    const max = counts.length ? Math.max(...counts) : 0;
    const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;

    return {
      months: trimmed.map((m) => ({ key: monthKey(m), label: monthLabel(m) })),
      counts,
      max,
      avg
    };
  }, [data.events]);

  const bookingsPerEvent = useMemo(() => {
    if (totalEvents <= 0) return 0;
    return totalBookings / totalEvents;
  }, [totalBookings, totalEvents]);

  const recentBookings = useMemo(() => {
    const getDate = (b) => parseDate(b?.date ?? b?.bookingDate ?? b?.created_at);
    const getEventName = (b) =>
      b?.eventName ??
      b?.event_name ??
      b?.event?.event_name ??
      b?.event?.name ??
      "Event";

    return [...data.bookings]
      .sort((a, b) => {
        const da = getDate(a)?.getTime() ?? 0;
        const db = getDate(b)?.getTime() ?? 0;
        return db - da;
      })
      .slice(0, 3)
      .map((b) => ({
        eventName: getEventName(b),
        date: getDate(b)
      }));
  }, [data.bookings]);

  return (
    <div className="Dashboard">
      <h2>Dashboard Overview</h2>

      {error ? <div style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>{error}</div> : null}
      {loading ? <div style={{ color: "var(--white-muted)", fontSize: 13, marginBottom: 12 }}>Loading...</div> : null}

      {/* TOP CARDS */}
      <div className="Dashboard-cards">
        <div className="Dashboard-card">
          <h3>Active Venues</h3>
          <div className="Dashboard-number">{totalVenues}</div>
        </div>

        <div className="Dashboard-card">
          <h3>Total Events</h3>
          <div className="Dashboard-number">{totalEvents}</div>
        </div>

        <div className="Dashboard-card">
          <h3>Total Bookings</h3>
          <div className="Dashboard-number">{totalBookings}</div>
        </div>
      </div>

      {/* INSIGHTS */}
      <div className="Dashboard-insights">
        <div className="Dashboard-insight-box">
          <h4>Events per Month (Showcase)</h4>

          <div className="Dashboard-chart-top">
            <div className="Dashboard-chart-average">
              <div className="Dashboard-chart-average-num">
                {eventsChart.avg ? eventsChart.avg.toFixed(1) : "0.0"}
              </div>
              <div className="Dashboard-chart-average-sub">Avg events / month</div>
            </div>
          </div>

          {eventsChart.months.length ? (
            <>
              <div className="Dashboard-chart">
                <div className="Dashboard-chart-bars" aria-hidden="true">
                  {eventsChart.counts.map((count, idx) => {
                    const heightPct = eventsChart.max ? (count / eventsChart.max) * 100 : 0;
                    return (
                      <div
                        key={eventsChart.months[idx].key}
                        className="Dashboard-chart-bar"
                        style={{ height: `${heightPct}%` }}
                      >
                        <span />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="Dashboard-chart-labels">
                {eventsChart.months.map((m) => (
                  <div key={m.key}>{m.label}</div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: "var(--white-muted)", fontSize: 13 }}>No event dates yet.</div>
          )}
        </div>

        <div className="Dashboard-insight-box">
          <h4>Bookings per Event</h4>
          <div className="Dashboard-number" style={{ marginBottom: 8 }}>
            {bookingsPerEvent ? bookingsPerEvent.toFixed(2) : "0.00"}
          </div>
          <div style={{ color: "var(--white-muted)", fontWeight: 600, fontSize: 13 }}>
            Derived from current totals.
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="Dashboard-activity">
        <h4>Recent Activity</h4>
        <ul>
          {recentBookings.length ? (
            recentBookings.map((b, i) => (
              <li key={i}>
                📅 Booking made for <strong>{b.eventName}</strong>
                {b.date ? <span style={{ color: "var(--white-muted)" }}> ({b.date.toISOString().slice(0, 10)})</span> : null}
              </li>
            ))
          ) : (
            <li>No recent activity</li>
          )}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
import { NavLink } from "react-router-dom";

import "../style/Home-content.css";
import { readStoredUser } from "../utils/auth";

function HomeContent() {
  const storedUser = readStoredUser();
  let userName = "User";
  let isAttendee = false;

  if (storedUser) {
    if (storedUser?.name) userName = storedUser.name;
    isAttendee = String(storedUser?.role || "").toLowerCase() === "attendee";
  }

  return (
    <div className="HomeContent">
      {/* HERO */}
      <section className="hero">
        <div className="hero-text">
          <h1>
            Welcome back, <span>{userName}</span> 👋
          </h1>
          {isAttendee ? (
            <p>Browse events, check the dashboard, and request to join when hosts allow it.</p>
          ) : (
            <p>
              Manage your events, explore venues, and connect with vendors — all in one place.
            </p>
          )}

          <div className="hero-buttons">
            {isAttendee ? (
              <>
                <NavLink to="/home/events" className="btn primary">
                  Browse events
                </NavLink>
                <NavLink to="/home/dashboard" className="btn secondary">
                  Dashboard
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/home/venues" className="btn primary">
                  Explore Venues
                </NavLink>
                <NavLink to="/home/dashboard" className="btn secondary">
                  Dashboard
                </NavLink>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section className="cards">
        <NavLink to="/home/events" className="card">
          <h3>🎫 Events</h3>
          <p>{isAttendee ? "Discover events and request to join." : "Organise and manage your events."}</p>
        </NavLink>
        <NavLink to="/home/dashboard" className="card">
          <h3>📊 Dashboard</h3>
          <p>Overview of activity and stats.</p>
        </NavLink>
        {!isAttendee && (
          <>
            <NavLink to="/home/attendees" className="card">
              <h3>👥 Attendees</h3>
              <p>Handle join requests and approvals.</p>
            </NavLink>
            <NavLink to="/home/venues" className="card">
              <h3>🏛 Venues</h3>
              <p>Discover and compare venues for your events.</p>
            </NavLink>

            <NavLink to="/home/vendors" className="card">
              <h3>🎤 Vendors</h3>
              <p>Find photographers, caterers, decorators & more.</p>
            </NavLink>

            <NavLink to="/home/bookings" className="card">
              <h3>📅 Bookings</h3>
              <p>Track your bookings and availability easily.</p>
            </NavLink>
          </>
        )}
      </section>

      {/* TIP */}
      <section className="tip">
        💡 Tip: Use the navigation bar to explore everything faster.
      </section>
    </div>
  );
}

export default HomeContent;

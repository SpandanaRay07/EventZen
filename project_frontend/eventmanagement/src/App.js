import "./style/App.css";
import "./style/Home.css";
import "./style/landing.css";

import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./Login";
import Register from "./Register";
import Landing from "./pages/Landing";
import Home from "./Home";
import Dashboard from "./pages/Dashboard";
import HomeContent from "./pages/HomeContent";
import Venue from "./pages/Venue";
import Vendor from "./pages/Vendor";
import Booking from "./pages/Booking";
import Event from "./pages/Event";
import Attendee from "./pages/Attendee";
import ExploreEvents from "./pages/ExploreEvents";
import { readStoredUser } from "./utils/auth";

function BlockAttendeeFromMgmt({ user, children }) {
  const role = String(user?.role || "").toLowerCase();
  if (user && role === "attendee") {
    return <Navigate to="/home/events" replace />;
  }
  return children;
}

function AppShell({ user }) {
  const location = useLocation();
  const isLanding = location.pathname === "/landing";

  const [showProfile, setShowProfile] = useState(false);
  const userName = user?.name || "User";
  const userRole = user?.role || "";
  const isAttendee = String(user?.role || "").toLowerCase() === "attendee";

  return (
    <div className={`App${isLanding ? " App--landing" : ""}`}>

      {/* Landing Navbar */}
      {isLanding && (
        <header className="Landing-nav">
          <div className="Landing-nav-logo">EVENT<span>ZEN</span></div>
          <nav className="Landing-nav-links">
            <NavLink to="/explore" className="Landing-nav-link">
              Explore events
            </NavLink>
            <NavLink to="/login" className="Landing-nav-link">Login</NavLink>
            <NavLink to="/register" className="Landing-nav-cta">Register</NavLink>
          </nav>
        </header>
      )}

      {/* Main Navbar */}
      {!isLanding && (
        <header className="Home-header">
          <div className="Home-logo">EVENTZEN</div>

          <nav className="Home-nav">
            {user ? (
              <>
                <NavLink to="/home" end>Home</NavLink>
                <NavLink to="/home/dashboard">Dashboard</NavLink>
                <NavLink to="/home/events">Events</NavLink>
                {!isAttendee && (
                  <>
                    <NavLink to="/home/attendees">Attendees</NavLink>
                    <NavLink to="/home/venues">Venues</NavLink>
                    <NavLink to="/home/vendors">Vendors</NavLink>
                    <NavLink to="/home/bookings">Bookings</NavLink>
                  </>
                )}
              </>
            ) : (
              <>
                <NavLink to="/landing">Home</NavLink>
                <NavLink to="/login">Login</NavLink>
                <NavLink to="/register">Register</NavLink>
              </>
            )}
          </nav>

          {/* Profile */}
          {user && (
            <div className="Home-profile">
              <button
                className="Home-profile-icon"
                onClick={() => setShowProfile((p) => !p)}
              >
                <span className="Home-profile-avatar">
                  {userName.charAt(0).toUpperCase()}
                </span>
              </button>

              {showProfile && (
                <div className="Home-profile-menu">
                  <div className="Home-profile-name">{userName}</div>
                  <div className="Home-profile-role">{userRole}</div>

                  <div className="Home-profile-logout">
                    <Link style={{ color: "var(--text)" }}
                      to="/login"
                      onClick={() => {
                        localStorage.removeItem("user");
                        window.dispatchEvent(new Event("authChanged"));
                        setShowProfile(false);
                      }}
                    >
                      Logout
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>
      )}

      {/* Routes */}
      <main className={isLanding ? "Landing-wrapper" : "App-main"}>
        <Routes>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/explore" element={<ExploreEvents />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/home" element={<Home />}>
            <Route index element={<HomeContent />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="venues"
              element={
                <BlockAttendeeFromMgmt user={user}>
                  <Venue />
                </BlockAttendeeFromMgmt>
              }/>
            <Route path="vendors"
              element={
                <BlockAttendeeFromMgmt user={user}>
                  <Vendor />
                </BlockAttendeeFromMgmt>
              }/>
            <Route path="events" element={<Event />} />
            <Route path="attendees"
              element={
                <BlockAttendeeFromMgmt user={user}>
                  <Attendee />
                </BlockAttendeeFromMgmt>
              }/>
            <Route path="bookings"
              element={
                <BlockAttendeeFromMgmt user={user}>
                  <Booking />
                </BlockAttendeeFromMgmt>
              }/>
          </Route>
        </Routes>
      </main>

    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => readStoredUser());

  useEffect(() => {
    const refresh = () => {
      setUser(readStoredUser());
    };

    refresh();
    window.addEventListener("authChanged", refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener("authChanged", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <Router>
      <AppShell user={user} />
    </Router>
  );
}

export default App;
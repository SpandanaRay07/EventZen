import { Link } from "react-router-dom";
import landingImg from "../images/landingpage_img.png";

function Landing() {
return ( <div className="Landing">
  {/* ── HERO ── */}
  <section className="Landing-hero">
    
    <div className="Landing-hero-container">

      {/* LEFT SIDE */}
      <div className="Landing-hero-inner">
        <div className="Landing-badge">Event Management, Simplified</div>

        <h1 className="Landing-hero-title">
          Plan Events.<br />
          Book Venues.<br />
          <span className="Landing-hero-accent">All in One Place.</span>
        </h1>

        <p className="Landing-hero-sub">
          EventZen brings together venues, vendors, and bookings into a single
          clean workspace — so you can focus on the experience, not the chaos.
        </p>

        <div className="Landing-hero-actions">
          <Link to="/register" className="Landing-btn-register">
            Get Started Free
          </Link>
          <Link to="/login" className="Landing-btn-login">
            Sign In
          </Link>
        </div>
      </div>

      {/* RIGHT SIDE IMAGE + HOTSPOTS */}
      <div className="Landing-hero-image">

        <Link to="/explore" className="Landing-btn-explore">
          Explore Events
        </Link>

        <img src={landingImg} alt="Event Stage" />

        {/* HOTSPOTS */}

        <div className="hotspot hotspot-attendees">
          <span>
            👥 Attendees: Explore events and join experiences seamlessly
          </span>
        </div>

        <div className="hotspot hotspot-event">
          <span>
            🎤 Event: Create and manage events with full control
          </span>
        </div>

        <div className="hotspot hotspot-vendor">
          <span>
            🛠 Vendors: Connect with decorators, caterers & more
          </span>
        </div>

        <div className="hotspot hotspot-venue">
          <span>
            🏛 Venue: Browse and book venues with capacity insights
          </span>
        </div>
        <p className="Landing-hover-hint">
          Hover to discover elements
        </p>

      </div>

    </div>

    {/* Decorative blobs */}
    <div className="Landing-blob Landing-blob--1" />
    <div className="Landing-blob Landing-blob--2" />

  </section>

  {/* ── FEATURES ── */}
  <section className="Landing-features">
    <p className="Landing-section-label">What you get</p>
    <h2 className="Landing-section-title">
      Everything you need to run events
    </h2>

    <div className="Landing-features-grid">

      <div className="Landing-feature-card">
        <div className="Landing-feature-icon">📍</div>
        <h3 className="Landing-feature-title">Event Management</h3>
        <p className="Landing-feature-desc">
          Create, browse, and manage events with capacity and location.
        </p>
      </div>

      <div className="Landing-feature-card">
        <div className="Landing-feature-icon">🛠</div>
        <h3 className="Landing-feature-title">Vendor Directory</h3>
        <p className="Landing-feature-desc">
          Manage vendors like caterers, decorators, and photographers.
        </p>
      </div>

      <div className="Landing-feature-card">
        <div className="Landing-feature-icon">📅</div>
        <h3 className="Landing-feature-title">Smart Bookings</h3>
        <p className="Landing-feature-desc">
          Book venues and track approval status easily.
        </p>
      </div>

      <div className="Landing-feature-card">
        <div className="Landing-feature-icon">📊</div>
        <h3 className="Landing-feature-title">Live Dashboard</h3>
        <p className="Landing-feature-desc">
          View all events, bookings, and activity in one place.
        </p>
      </div>

    </div>
  </section>

  {/* ── HOW IT WORKS ── */}
  <section className="Landing-steps">
    <p className="Landing-section-label">How it works</p>
    <h2 className="Landing-section-title">Up and running in minutes</h2>

    <div className="Landing-steps-row">

      <div className="Landing-step">
        <div className="Landing-step-num">01</div>
        <h4 className="Landing-step-title">Create your account</h4>
        <p className="Landing-step-desc">
          Register as an admin, user, or attendee.
        </p>
      </div>

      <div className="Landing-step-divider" />

      <div className="Landing-step">
        <div className="Landing-step-num">02</div>
        <h4 className="Landing-step-title">Add your event</h4>
        <p className="Landing-step-desc">
          Choose venue, vendor, and attendees.
        </p>
      </div>

      <div className="Landing-step-divider" />

      <div className="Landing-step">
        <div className="Landing-step-num">03</div>
        <h4 className="Landing-step-title">Manage & book</h4>
        <p className="Landing-step-desc">
          Handle bookings and run events smoothly.
        </p>
      </div>

    </div>
  </section>

  {/* ── CTA ── */}
  <section className="Landing-cta">
    <div className="Landing-cta-inner">
      <h2 className="Landing-cta-title">Ready to get started?</h2>
      <p className="Landing-cta-sub">
        Join EventZen and take control of your events today.
      </p>

      <Link to="/register" className="Landing-btn-register">
        Let's Get Started →
      </Link>
    </div>

    <div className="Landing-cta-blob" />
  </section>

  {/* ── FOOTER ── */}
  <footer className="Landing-footer">
    <span className="Landing-footer-logo">EVENTZEN</span>
    <span className="Landing-footer-copy">
      © 2026 EventZen. All rights reserved.
    </span>
  </footer>

</div>

);
}

export default Landing;

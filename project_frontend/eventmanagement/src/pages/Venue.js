import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../style/venue.css";
import { readStoredUser } from "../utils/auth";

const API_BASE = "http://localhost:8082/venues";

function Venue() {
  const storedUser = readStoredUser();
  const isAdmin = storedUser?.role === "admin";

  const [venues, setVenues] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newVenue, setNewVenue] = useState({ name: "", location: "", capacity: "" });
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error((await res.text()) || "Failed to load venues");
      const data = await res.json();
      setVenues(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVenues(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVenue((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!isAdmin) { alert("You are not allowed to create venues."); return; }
    if (!newVenue.name || !newVenue.location || !newVenue.capacity) {
      alert("Please fill all fields.");
      return;
    }
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newVenue.name, location: newVenue.location, capacity: Number(newVenue.capacity) }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed to create venue");
      setNewVenue({ name: "", location: "", capacity: "" });
      setShowCreate(false);
      fetchVenues();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) { alert("You are not allowed to delete venues."); return; }
    if (!window.confirm("Delete this venue?")) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Failed to delete venue");
      setVenues((prev) => prev.filter((v) => v.venueId !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const filteredVenues = venues.filter((v) => {
    const term = search.toLowerCase();
    return v.name?.toLowerCase().includes(term) || v.location?.toLowerCase().includes(term);
  });

  // Pick an icon letter/emoji for the venue avatar
  const venueInitial = (name) => name?.charAt(0)?.toUpperCase() || "V";

  return (
    <div className="Venue-layout">

      {/* ── Main gallery area ── */}
      <div className="Venue-main">

        {/* Header */}
        <div className="Venue-header-row">
          <div>
            <h2 className="Venue-title">Venues</h2>
            <p className="Venue-subtitle">{filteredVenues.length} venue{filteredVenues.length !== 1 ? "s" : ""} available</p>
          </div>
          <div className="Venue-header-actions">
            <input
              type="text"
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="Venue-search"
            />
            {isAdmin && (
              <button className="Venue-create-btn" onClick={() => setShowCreate(true)}>
                + Add Venue
              </button>
            )}
          </div>
        </div>

        {error && <div className="Venue-error">{error}</div>}
        {loading && <div className="Venue-loading">Loading venues…</div>}

        {/* Gallery grid */}
        <div className="Venue-gallery">
          {filteredVenues.length === 0 && !loading ? (
            <p className="Venue-empty">No venues found.</p>
          ) : (
            filteredVenues.map((venue) => (
              <div key={venue.venueId} className="Venue-card">
                {/* Colourful avatar band */}
                <div className="Venue-card-band">
                  <span className="Venue-card-initial">{venueInitial(venue.name)}</span>
                </div>

                <div className="Venue-card-body">
                  <h3 className="Venue-card-name">{venue.name}</h3>

                  <div className="Venue-card-meta">
                    <span className="Venue-meta-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {venue.location || "—"}
                    </span>
                    {venue.capacity != null && (
                      <span className="Venue-meta-item">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {venue.capacity.toLocaleString()} guests
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      className="Venue-delete-btn"
                      onClick={() => handleDelete(venue.venueId)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Side panel ── */}
      <aside className="Venue-side">
        <div className="Venue-side-section">
          <p className="Venue-side-label">Manage</p>

          <button className="Venue-side-btn" onClick={() => navigate("/home/vendors")}>
            <span className="Venue-side-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
            </span>
            <span className="Venue-side-btn-text">
              <span className="Venue-side-btn-title">Vendors</span>
              <span className="Venue-side-btn-sub">Browse services</span>
            </span>
            <svg className="Venue-side-btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <button className="Venue-side-btn" onClick={() => navigate("/home/bookings")}>
            <span className="Venue-side-btn-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </span>
            <span className="Venue-side-btn-text">
              <span className="Venue-side-btn-title">Bookings</span>
              <span className="Venue-side-btn-sub">Check availability</span>
            </span>
            <svg className="Venue-side-btn-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="Venue-side-section">
          <p className="Venue-side-label">Summary</p>
          <div className="Venue-side-stat">
            <span className="Venue-side-stat-num">{venues.length}</span>
            <span className="Venue-side-stat-label">Total Venues</span>
          </div>
          <div className="Venue-side-stat">
            <span className="Venue-side-stat-num">
              {venues.reduce((acc, v) => acc + (Number(v.capacity) || 0), 0).toLocaleString()}
            </span>
            <span className="Venue-side-stat-label">Total Capacity</span>
          </div>
        </div>
      </aside>

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="Venue-modal-backdrop">
          <div className="Venue-modal">
            <h3 className="Venue-modal-title">Add New Venue</h3>
            <form onSubmit={handleCreate} className="Venue-form">
              <label className="Venue-form-label">
                Name
                <input type="text" name="name" value={newVenue.name} onChange={handleInputChange} placeholder="Grand Ballroom" />
              </label>
              <label className="Venue-form-label">
                Location
                <input type="text" name="location" value={newVenue.location} onChange={handleInputChange} placeholder="City, State" />
              </label>
              <label className="Venue-form-label">
                Capacity
                <input type="number" name="capacity" value={newVenue.capacity} onChange={handleInputChange} placeholder="500" />
              </label>
              <div className="Venue-form-actions">
                <button type="button" className="Venue-cancel-btn" onClick={() => { setShowCreate(false); setNewVenue({ name: "", location: "", capacity: "" }); }}>
                  Cancel
                </button>
                <button type="submit">Save Venue</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Venue;
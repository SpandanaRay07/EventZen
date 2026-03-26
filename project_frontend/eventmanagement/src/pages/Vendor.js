import { useEffect, useMemo, useState } from "react";

import "../style/vendor.css";
import { readStoredUser } from "../utils/auth";

const VENDOR_API_BASE = "http://localhost:8082/vendors";
function Vendor() {
  const storedUser = readStoredUser();
  const isAdmin = storedUser?.role === "admin";

  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newVendor, setNewVendor] = useState({
    name: "",
    serviceType: "",
    phone: "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [editVendor, setEditVendor] = useState({
    name: "",
    serviceType: "",
    phone: "",
  });
  const fetchVendors = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(VENDOR_API_BASE);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load vendors");
      }
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchVendors();
  }, []);
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVendor((prev) => ({ ...prev, [name]: value }));
  };
  const handleCreate = async (e) => {
    e.preventDefault();

    if (!isAdmin) {
      alert("You are not allowed to create vendors.");
      return;
    }

    if (!newVendor.name) {
      alert("Vendor name is required.");
      return;
    }
    try {
      setError("");
      const res = await fetch(VENDOR_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newVendor.name,
          serviceType: newVendor.serviceType,
          phone: newVendor.phone,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create vendor");
      }
      setNewVendor({ name: "", serviceType: "", phone: "" });
      setShowCreate(false);
      fetchVendors();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };
  const handleDelete = async (vendorId) => {
    if (!isAdmin) {
      alert("You are not allowed to delete vendors.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    try {
      setError("");
      const res = await fetch(`${VENDOR_API_BASE}/${vendorId}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete vendor");
      }
      setVendors((prev) => prev.filter((v) => v.vendorId !== vendorId));
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };

  const openEdit = (vendor) => {
    if (!isAdmin) {
      alert("You are not allowed to update vendors.");
      return;
    }
    setEditingVendor(vendor);
    setEditVendor({
      name: vendor?.name || "",
      serviceType: vendor?.serviceType || "",
      phone: vendor?.phone || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditVendor((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("You are not allowed to update vendors.");
      return;
    }
    if (!editingVendor?.vendorId) return;
    if (!editVendor.name?.trim()) {
      alert("Vendor name is required.");
      return;
    }
    try {
      setError("");
      const res = await fetch(`${VENDOR_API_BASE}/${editingVendor.vendorId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editVendor.name,
          serviceType: editVendor.serviceType,
          phone: editVendor.phone,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update vendor");
      }
      setEditingVendor(null);
      fetchVendors();
    } catch (e) {
      console.error(e);
      setError(e.message);
    }
  };
  const filteredVendors = useMemo(() => {
    const term = search.toLowerCase();
    return vendors.filter((v) => {
      return (
        v.name?.toLowerCase().includes(term) ||
        v.serviceType?.toLowerCase().includes(term) ||
        v.phone?.toLowerCase().includes(term)
      );
    });
  }, [vendors, search]);
  return (
    <div className="Vendor-page">
      <div className="Vendor-header-row">
        <h2>Vendors</h2>
        <div className="Vendor-header-actions">
          <input
            type="text"
            placeholder="Search vendors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isAdmin && (
            <button type="button" onClick={() => setShowCreate(true)}>
              + Create
            </button>
          )}
        </div>
      </div>
      {error && <div className="Vendor-error">{error}</div>}
      {loading && <div className="Vendor-loading">Loading vendors...</div>}
      <section className="Vendor-table-wrap">
        <table className="Vendor-table">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Category</th>
              <th>Contact</th>
              <th style={{ width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVendors.length === 0 && !loading ? (
              <tr>
                <td colSpan={4} className="Vendor-empty">
                  No vendors found.
                </td>
              </tr>
            ) : (
              filteredVendors.map((vendor) => (
                <tr key={vendor.vendorId}>
                  <td>{vendor.name}</td>
                  <td>{vendor.serviceType || "-"}</td>
                  <td>{vendor.phone || "-"}</td>
                  <td>
                    <div className="Vendor-actions">
                      {isAdmin ? (
                        <>
                          <button
                            type="button"
                            className="Vendor-action-btn"
                            onClick={() => openEdit(vendor)}
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            className="Vendor-action-btn Vendor-action-btn--danger"
                            onClick={() => handleDelete(vendor.vendorId)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="Vendor-actions--readonly">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      {showCreate && (
        <div className="Vendor-modal-backdrop">
          <div className="Vendor-modal">
            <h3>Create New Vendor</h3>
            <form onSubmit={handleCreate} className="Vendor-form">
              <label>
                Name *
                <input
                  type="text"
                  name="name"
                  value={newVendor.name}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Service Type
                <input
                  type="text"
                  name="serviceType"
                  value={newVendor.serviceType}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                Phone
                <input
                  type="text"
                  name="phone"
                  value={newVendor.phone}
                  onChange={handleInputChange}
                />
              </label>
              <div className="Vendor-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewVendor({ name: "", serviceType: "", phone: "" });
                  }}
                >
                  Cancel
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingVendor && (
        <div className="Vendor-modal-backdrop">
          <div className="Vendor-modal">
            <h3>Update Vendor</h3>
            <form onSubmit={handleUpdate} className="Vendor-form">
              <label>
                Vendor Name *
                <input
                  type="text"
                  name="name"
                  value={editVendor.name}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Category
                <input
                  type="text"
                  name="serviceType"
                  value={editVendor.serviceType}
                  onChange={handleEditChange}
                />
              </label>
              <label>
                Contact
                <input
                  type="text"
                  name="phone"
                  value={editVendor.phone}
                  onChange={handleEditChange}
                />
              </label>
              <div className="Vendor-form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVendor(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Vendor;
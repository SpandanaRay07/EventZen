const db = require("../db");

function isAdminRequest(req) {
  const role =
    req.headers["x-role"] ||
    req.headers["x_user_role"] ||
    req.headers["x-user-role"];
  const adminFlag = req.headers["x-admin"];
  return role === "admin" || role === "ADMIN" || adminFlag === "true";
}

function requireAdmin(req, res, next) {
  if (!isAdminRequest(req)) {
    return res.status(403).json({
      message:
        "Admin only. Send header x-role: admin (or x-admin: true) to use this endpoint."
    });
  }
  next();
}

exports.requireAdmin = requireAdmin;

exports.createBooking = (req, res) => {
  const { event_id, venue_id, date } = req.body;
  if (!venue_id || !date) {
    return res
      .status(400)
      .json({ message: "Missing required fields: venue_id, date" });
  }

  db.query(
    "INSERT INTO bookings (event_id, venue_id, date, status) VALUES (?, ?, ?, 'pending')",
    [event_id ?? null, venue_id, date],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({
        message: "Booking created",
        bookingId: result.insertId,
        status: "pending"
      });
    }
  );
};

exports.getBookings = (req, res) => {
  db.query("SELECT * FROM bookings ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getBookingById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM bookings WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });
    res.json(rows[0]);
  });
};

exports.cancelBooking = (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE bookings SET status='cancelled' WHERE id=? AND status IN ('pending','approved')",
    [id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({
          message:
            "Not found, or booking cannot be cancelled (already rejected/cancelled)."
        });
      }
      res.json({ message: "Booking cancelled" });
    }
  );
};

exports.approveBooking = [
  requireAdmin,
  (req, res) => {
    const { id } = req.params;
    db.query(
      "UPDATE bookings SET status='approved' WHERE id=? AND status='pending'",
      [id],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Not found, or not in pending status" });
        }
        res.json({ message: "Booking approved" });
      }
    );
  }
];

exports.rejectBooking = [
  requireAdmin,
  (req, res) => {
    const { id } = req.params;
    db.query(
      "UPDATE bookings SET status='rejected' WHERE id=? AND status='pending'",
      [id],
      (err, result) => {
        if (err) return res.status(500).json({ message: err.message });
        if (result.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Not found, or not in pending status" });
        }
        res.json({ message: "Booking rejected" });
      }
    );
  }
];

exports.updateBooking = (req, res) => {
  const { id } = req.params;
  const status = req.body?.status;

  if (!status) {
    return res.status(400).json({ message: "Missing required field: status" });
  }

  const normalized = String(status).toLowerCase();
  const allowed = new Set(["pending", "approved", "rejected", "cancelled"]);
  if (!allowed.has(normalized)) {
    return res.status(400).json({
      message:
        "Invalid status. Allowed: pending, approved, rejected, cancelled"
    });
  }

  const wantsAdminStatus = normalized === "approved" || normalized === "rejected";
  if (wantsAdminStatus && !isAdminRequest(req)) {
    return res.status(403).json({
      message:
        "Only admin can approve/reject. Send header x-role: admin (or x-admin: true)."
    });
  }

  db.query("SELECT * FROM bookings WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });

    const current = String(rows[0].status || "").toLowerCase();

    if (current === normalized) {
      return res.json({ message: "No change", booking: rows[0] });
    }

    if (current === "rejected" || current === "cancelled") {
      return res.status(400).json({
        message: `Cannot update booking in '${current}' status`
      });
    }

    if (normalized === "pending") {
      return res.status(400).json({
        message: "Cannot set status back to pending"
      });
    }

    if (normalized === "cancelled") {
      // allow user cancel from pending/approved
      return db.query(
        "UPDATE bookings SET status='cancelled' WHERE id=? AND status IN ('pending','approved')",
        [id],
        (err2, result) => {
          if (err2) return res.status(500).json({ message: err2.message });
          if (result.affectedRows === 0) {
            return res.status(400).json({
              message: "Booking cannot be cancelled from current status"
            });
          }
          return db.query(
            "SELECT * FROM bookings WHERE id = ?",
            [id],
            (err3, rows2) => {
              if (err3) return res.status(500).json({ message: err3.message });
              res.json({ message: "Booking updated", booking: rows2?.[0] });
            }
          );
        }
      );
    }

    // approved / rejected (admin only, pending only)
    const targetSql =
      normalized === "approved"
        ? "UPDATE bookings SET status='approved' WHERE id=? AND status='pending'"
        : "UPDATE bookings SET status='rejected' WHERE id=? AND status='pending'";

    db.query(targetSql, [id], (err2, result) => {
      if (err2) return res.status(500).json({ message: err2.message });
      if (result.affectedRows === 0) {
        return res
          .status(400)
          .json({ message: "Booking must be pending to approve/reject" });
      }
      db.query("SELECT * FROM bookings WHERE id = ?", [id], (err3, rows2) => {
        if (err3) return res.status(500).json({ message: err3.message });
        res.json({ message: "Booking updated", booking: rows2?.[0] });
      });
    });
  });
};


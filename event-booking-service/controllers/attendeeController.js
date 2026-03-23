const db = require("../db");

exports.getAttendees = (req, res) => {
  const { event_id } = req.query;
  const sql = event_id
    ? "SELECT id, event_id, attendee_name AS name, attendee_email AS email, created_at FROM event_attendees WHERE event_id = ? ORDER BY id DESC"
    : "SELECT id, event_id, attendee_name AS name, attendee_email AS email, created_at FROM event_attendees ORDER BY id DESC";

  const params = event_id ? [event_id] : [];
  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
};

exports.getAttendeeById = (req, res) => {
  const { id } = req.params;
  db.query(
    "SELECT id, event_id, attendee_name AS name, attendee_email AS email, created_at FROM event_attendees WHERE id = ?",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows?.length) return res.status(404).json({ message: "Not found" });
      res.json(rows[0]);
    }
  );
};

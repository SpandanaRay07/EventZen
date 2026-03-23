const db = require("../db");

const VALID_ROLES = new Set(["participant", "speaker", "organizer", "guest"]);
const VALID_STATUSES = new Set(["pending", "accepted", "rejected"]);

function normalizeRole(role) {
  if (!role) return "participant";
  return String(role).toLowerCase().trim();
}

function normalizeStatus(status) {
  return String(status || "").toLowerCase().trim();
}

/** MySQL TINYINT(1) may come back as 0/1, string, or Buffer — treat all as boolean. */
function isAllowAttendeeRequestEnabled(row) {
  const raw = row.allow_attendee_request;
  if (raw === true) return true;
  if (raw === false || raw === null || raw === undefined) return false;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "1" || s === "true";
  }
  if (Buffer.isBuffer(raw) && raw.length === 1) return raw[0] === 1;
  return Number(raw) === 1;
}

function ensureEventAttendee(eventId, name, email, callback) {
  db.query(
    "SELECT id FROM event_attendees WHERE event_id = ? AND attendee_email = ?",
    [eventId, email],
    (err, rows) => {
      if (err) return callback(err);
      if (rows?.length) return callback(null, { existed: true });

      db.query(
        "INSERT INTO event_attendees (event_id, attendee_name, attendee_email) VALUES (?, ?, ?)",
        [eventId, name, email],
        (err2, result) => {
          if (err2) return callback(err2);
          callback(null, { existed: false, insertId: result.insertId });
        }
      );
    }
  );
}

exports.createAttendeeRequest = (req, res) => {
  const { name, email, role, event_id, date } = req.body;
  const normalizedRole = normalizeRole(role);

  if (!name || !email || !event_id || !date) {
    return res.status(400).json({
      message: "Missing required fields: name, email, event_id, date"
    });
  }

  if (!VALID_ROLES.has(normalizedRole)) {
    return res.status(400).json({
      message: "Invalid role. Allowed: participant, speaker, organizer, guest"
    });
  }
  //check user if exists
  db.query(
    "SELECT id FROM attendee_requests WHERE event_id = ? AND email = ?",
    [event_id, email],
    (checkErr, checkRows) => {
      if (checkErr) {
        return res.status(500).json({ message: checkErr.message });
      }

      const exists = checkRows.length > 0;

      if (exists) {
        return res.status(400).json({
          message: "User already requested this event"
        });
      }
      db.query(
        "SELECT id, allow_attendee_request FROM events WHERE id = ?",
        [event_id],
        (eventErr, eventRows) => {
          if (eventErr) {
            return res.status(500).json({
              message: eventErr.message
            });
          }

          if (!eventRows?.length) {
            return res.status(404).json({ message: "Event not found" });
          }

          const enabled = isAllowAttendeeRequestEnabled(eventRows[0]);

          if (!enabled) {
            return res.status(400).json({
              message: "Attendee requests are disabled for this event"
            });
          }
          const sql = `
            INSERT INTO attendee_requests (name, email, role, event_id, date, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
          `;

          db.query(
            sql,
            [name, email, normalizedRole, event_id, date],
            (err, result) => {
              if (err) return res.status(500).json({ message: err.message });

              return res.status(201).json({
                message: "Attendee request created",
                attendeeRequestId: result.insertId,
                status: "pending"
              });
            }
          );
        }
      );
    }
  );
};
exports.getAttendeeRequests = (req, res) => {
  const { event_id, status } = req.query;
  const conditions = [];
  const params = [];

  if (event_id) {
    conditions.push("event_id = ?");
    params.push(event_id);
  }

  if (status) {
    const normalized = normalizeStatus(status);
    if (!VALID_STATUSES.has(normalized)) {
      return res
        .status(400)
        .json({ message: "Invalid status. Allowed: pending, accepted, rejected" });
    }
    conditions.push("status = ?");
    params.push(normalized);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM attendee_requests ${whereClause} ORDER BY id DESC`;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    return res.json(rows);
  });
};

exports.getAttendeeRequestById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM attendee_requests WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });
    return res.json(rows[0]);
  });
};

exports.updateAttendeeRequestStatus = (req, res) => {
  const { id } = req.params;
  const normalizedStatus = normalizeStatus(req.body?.status);

  if (!VALID_STATUSES.has(normalizedStatus)) {
    return res
      .status(400)
      .json({ message: "Invalid status. Allowed: pending, accepted, rejected" });
  }

  db.query("SELECT * FROM attendee_requests WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });

    const currentStatus = normalizeStatus(rows[0].status);
    if (currentStatus === normalizedStatus) {
      return res.json({ message: "No change", attendee_request: rows[0] });
    }

    db.query(
      "UPDATE attendee_requests SET status = ? WHERE id = ?",
      [normalizedStatus, id],
      (err2) => {
        if (err2) return res.status(500).json({ message: err2.message });

        db.query(
          "SELECT * FROM attendee_requests WHERE id = ?",
          [id],
          (err3, updatedRows) => {
            if (err3) return res.status(500).json({ message: err3.message });
            const updatedRequest = updatedRows[0];

            if (normalizedStatus === "accepted") {
              ensureEventAttendee(
                updatedRequest.event_id,
                updatedRequest.name,
                updatedRequest.email,
                (attErr, attRes) => {
                  if (attErr)
                    return res.status(500).json({ message: attErr.message });

                  const extraMsg = attRes.existed
                    ? "Attendee already exists in event attendees."
                    : "Attendee added to manual attendees.";

                  return res.json({
                    message: `Attendee request updated and accepted (${extraMsg})`,
                    attendee_request: updatedRequest,
                    attendee_added: !attRes.existed
                  });
                }
              );
            } else {
              return res.json({
                message: "Attendee request updated",
                attendee_request: updatedRequest
              });
            }
          }
        );
      }
    );
  });
};

exports.acceptAttendeeRequest = (req, res) => {
  req.body = { ...(req.body || {}), status: "accepted" };
  return exports.updateAttendeeRequestStatus(req, res);
};

exports.rejectAttendeeRequest = (req, res) => {
  req.body = { ...(req.body || {}), status: "rejected" };
  return exports.updateAttendeeRequestStatus(req, res);
};


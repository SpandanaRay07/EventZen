const db = require("../db");
const fetch = global.fetch || require("node-fetch");

/** Treat common JSON/body shapes as true (not only strict boolean). */
function isTruthyFlag(value) {
  if (value === true) return true;
  if (value === false || value == null) return false;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "1" || s === "true";
  }
  return false;
}

/** Accept allow_attendee_request OR allowAttendeeRequest (camelCase). */
function readAllowAttendeeRequestFlag(body) {
  return (
    isTruthyFlag(body.allow_attendee_request) ||
    isTruthyFlag(body.allowAttendeeRequest)
  );
}

function isAllowAttendeeRequestProvided(body) {
  return (
    Object.prototype.hasOwnProperty.call(body, "allow_attendee_request") ||
    Object.prototype.hasOwnProperty.call(body, "allowAttendeeRequest")
  );
}

/** MySQL TINYINT(1) is 0/1; expose a real boolean for clients (e.g. join UI). */
function eventRowForResponse(row) {
  if (!row) return row;
  const raw = row.allow_attendee_request;
  const allowAttendeeRequest =
    raw === true ||
    raw === 1 ||
    (typeof raw === "string" &&
      (raw.trim() === "1" || raw.trim().toLowerCase() === "true"));
  return { ...row, allowAttendeeRequest };
}

function isVendorIdsProvided(body) {
  return (
    Object.prototype.hasOwnProperty.call(body, "vendor_ids") ||
    Object.prototype.hasOwnProperty.call(body, "vendorIds") ||
    Object.prototype.hasOwnProperty.call(body, "vendors") ||
    Object.prototype.hasOwnProperty.call(body, "vendor_id") ||
    Object.prototype.hasOwnProperty.call(body, "vendorId")
  );
}

/**
 * Unique positive vendor ids from vendor_ids, vendorIds, vendors[], or legacy vendor_id / vendorId.
 */
function normalizeVendorIds(body) {
  let list = [];
  if (Object.prototype.hasOwnProperty.call(body, "vendor_ids")) {
    const v = body.vendor_ids;
    if (Array.isArray(v)) list = v;
    else if (v != null && v !== "") list = [v];
  } else if (Object.prototype.hasOwnProperty.call(body, "vendorIds")) {
    const v = body.vendorIds;
    if (Array.isArray(v)) list = v;
    else if (v != null && v !== "") list = [v];
  } else if (Object.prototype.hasOwnProperty.call(body, "vendors")) {
    const v = body.vendors;
    if (!Array.isArray(v)) {
      throw new Error("vendors must be an array of vendor ids or { id } objects");
    }
    list = v.map((item) =>
      typeof item === "object" && item != null && "id" in item ? item.id : item
    );
  } else if (
    Object.prototype.hasOwnProperty.call(body, "vendor_id") ||
    Object.prototype.hasOwnProperty.call(body, "vendorId")
  ) {
    const single = body.vendor_id ?? body.vendorId;
    if (single != null && single !== "") list = [single];
  }

  const ids = [
    ...new Set(
      list
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  ];
  ids.sort((a, b) => a - b);
  return ids;
}

/** List query: GROUP_CONCAT subquery + legacy events.vendor_id. */
function mergeVendorFieldsFromListRow(row) {
  const concat = row._vendor_id_concat;
  const { _vendor_id_concat, ...rest } = row;
  let vendor_ids = [];
  if (concat != null && String(concat) !== "") {
    vendor_ids = String(concat)
      .split(",")
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  if (!vendor_ids.length && rest.vendor_id != null) {
    vendor_ids = [Number(rest.vendor_id)];
  }
  const vendor_id = vendor_ids[0] ?? null;
  return { ...rest, vendor_id, vendor_ids, vendorIds: vendor_ids };
}

function replaceEventVendors(eventId, vendorIds, callback) {
  db.query(
    "DELETE FROM event_vendors WHERE event_id = ?",
    [eventId],
    (err) => {
      if (err) return callback(err);
      if (!vendorIds.length) return callback(null);
      const tuples = vendorIds.map((vid) => [eventId, vid]);
      db.query(
        "INSERT INTO event_vendors (event_id, vendor_id) VALUES ?",
        [tuples],
        callback
      );
    }
  );
}

async function getVenueCapacity(venueId) {
  const baseUrl = process.env.VENUE_SERVICE_URL;
  if (!baseUrl) {
    throw new Error(
      "VENUE_SERVICE_URL is not set (needed to validate venue capacity)"
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}/venues/${encodeURIComponent(
    venueId
  )}`;

  const resp = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Venue service error (${resp.status}) while fetching venue ${venueId}. ${text}`.trim()
    );
  }
  const venue = await resp.json();
  const capacity =
    venue?.capacity ??
    venue?.data?.capacity ??
    venue?.venue?.capacity ??
    venue?.result?.capacity;

  if (typeof capacity !== "number") {
    throw new Error(
      "Venue capacity not found in venue-service response (expected numeric capacity)"
    );
  }
  return capacity;
}

function normalizeAttendeesInput(attendees) {
  if (attendees == null) return [];
  if (!Array.isArray(attendees)) {
    throw new Error("attendees must be an array of { name, email }");
  }

  const normalized = attendees.map((a, idx) => {
    if (!a || typeof a !== "object" || Array.isArray(a)) {
      throw new Error(`attendees[${idx}] must be an object`);
    }

    const allowedKeys = new Set(["name", "email"]);
    for (const k of Object.keys(a)) {
      if (!allowedKeys.has(k)) {
        throw new Error(`attendees[${idx}] has invalid field '${k}'`);
      }
    }

    const name = typeof a.name === "string" ? a.name.trim() : "";
    const email = typeof a.email === "string" ? a.email.trim() : "";

    if (!name || !email) {
      throw new Error(`attendees[${idx}] requires name and email`);
    }

    return { name, email };
  });

  return normalized;
}

function countEventAttendees(eventId) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT COUNT(*) AS count FROM event_attendees WHERE event_id = ?",
      [eventId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(Number(rows?.[0]?.count || 0));
      }
    );
  });
}

function insertAttendees(eventId, attendees) {
  if (!attendees.length) return Promise.resolve();

  const values = attendees.map((a) => [
    eventId,
    a.name,
    a.email
  ]);

  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO event_attendees (event_id, attendee_name, attendee_email) VALUES ?",
      [values],
      (err) => {
        if (err) return reject(err);
        resolve();
      }
    );
  });
}

exports.getEventAttendeeRequests = (req, res) => {
  const { id } = req.params;
  db.query(
    "SELECT id, name, email, role, status, created_at FROM attendee_requests WHERE event_id = ? ORDER BY id DESC",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};

function createBookingForEvent(eventId, venueId, date) {
  return new Promise((resolve, reject) => {
    db.query(
      "INSERT INTO bookings (event_id, venue_id, date, status) VALUES (?, ?, ?, 'pending')",
      [eventId, venueId, date],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });
}

exports.createEvent = async (req, res) => {
  try {
    const { event_name, created_by, venue_id, date } = req.body;
    const allowAttendeeRequest = readAllowAttendeeRequestFlag(req.body);
    let vendorIds = [];
    try {
      vendorIds = normalizeVendorIds(req.body);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const primaryVendorId = vendorIds[0] ?? null;
    let attendees = [];
    try {
      attendees = normalizeAttendeesInput(req.body.attendees);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const create_booking =
      req.body.create_booking === true ||
      req.body.createBooking === true ||
      req.body.create_booking === "true" ||
      req.body.createBooking === "true";

    if (!event_name || !created_by || !venue_id || !date) {
      return res.status(400).json({
        message:
          "Missing required fields: event_name, created_by, venue_id, date"
      });
    }

    const capacity = await getVenueCapacity(venue_id);
    if (attendees.length > capacity) {
      return res.status(400).json({
        message: "Attendees exceed venue capacity",
        capacity,
        requestedAttendees: attendees.length
      });
    }

    db.query(
      "INSERT INTO events (event_name, created_by, venue_id, vendor_id, date, allow_attendee_request) VALUES (?, ?, ?, ?, ?, ?)",
      [
        event_name,
        created_by,
        venue_id,
        primaryVendorId,
        date,
        allowAttendeeRequest ? 1 : 0
      ],
      async (err, result) => {
        if (err) return res.status(500).json({ message: err.message });

        const eventId = result.insertId;
        try {
          await new Promise((resolve, reject) => {
            replaceEventVendors(eventId, vendorIds, (e2) =>
              e2 ? reject(e2) : resolve()
            );
          });
          await insertAttendees(eventId, attendees);
          const bookingId = create_booking
            ? await createBookingForEvent(eventId, venue_id, date)
            : null;

          return res.status(201).json({
            message: "Event created successfully",
            eventId,
            bookingId,
            vendor_ids: vendorIds,
            vendorIds
          });
        } catch (e) {
          return res.status(500).json({ message: e.message });
        }
      }
    );
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

exports.getEvents = (req, res) => {
  const sql = `
    SELECT
      e.*,
      (SELECT COUNT(*) FROM event_attendees ea WHERE ea.event_id = e.id) AS attendees_count,
      (SELECT GROUP_CONCAT(ev.vendor_id ORDER BY ev.vendor_id)
       FROM event_vendors ev WHERE ev.event_id = e.id) AS _vendor_id_concat
    FROM events e
    ORDER BY e.date DESC, e.id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(
      rows.map((r) => eventRowForResponse(mergeVendorFieldsFromListRow(r)))
    );
  });
};

exports.getEventById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM events WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });

    const baseEvent = eventRowForResponse(rows[0]);
    db.query(
      "SELECT vendor_id FROM event_vendors WHERE event_id = ? ORDER BY vendor_id",
      [id],
      (vErr, vrows) => {
        if (vErr) return res.status(500).json({ message: vErr.message });
        let vendor_ids = (vrows || []).map((r) => Number(r.vendor_id));
        if (!vendor_ids.length && baseEvent.vendor_id != null) {
          vendor_ids = [Number(baseEvent.vendor_id)];
        }
        const event = {
          ...baseEvent,
          vendor_id: vendor_ids[0] ?? null,
          vendor_ids,
          vendorIds: vendor_ids
        };

        db.query(
          "SELECT id, attendee_name, attendee_email, created_at FROM event_attendees WHERE event_id = ? ORDER BY id DESC",
          [id],
          (err2, attendees) => {
            if (err2) return res.status(500).json({ message: err2.message });
            const attendeesOut = attendees.map((a) => ({
              id: a.id,
              name: a.attendee_name,
              email: a.attendee_email,
              created_at: a.created_at
            }));

            db.query(
              "SELECT id, name, email, role, status, created_at FROM attendee_requests WHERE event_id = ? ORDER BY id DESC",
              [id],
              (errReq, requestRows) => {
                if (errReq)
                  return res.status(500).json({ message: errReq.message });

                const requestsOut = requestRows.map((r) => ({
                  id: r.id,
                  name: r.name,
                  email: r.email,
                  role: r.role,
                  status: r.status,
                  created_at: r.created_at
                }));

                db.query(
                  "SELECT * FROM bookings WHERE event_id = ? ORDER BY id DESC",
                  [id],
                  (err3, bookings) => {
                    if (err3)
                      return res.status(500).json({ message: err3.message });
                    res.json({
                      ...event,
                      attendees: attendeesOut,
                      attendees_count: attendeesOut.length,
                      attendee_requests: requestsOut,
                      bookings
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
};

exports.updateEvent = (req, res) => {
  const { id } = req.params;
  const { event_name, created_by, venue_id, date } = req.body;
  const allowAttendeeRequestProvided = isAllowAttendeeRequestProvided(req.body);
  const allowAttendeeRequestValue = readAllowAttendeeRequestFlag(req.body);

  const vendorIdsProvided = isVendorIdsProvided(req.body);
  let vendorIds = [];
  if (vendorIdsProvided) {
    try {
      vendorIds = normalizeVendorIds(req.body);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
  }

  db.query("SELECT * FROM events WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows?.length) return res.status(404).json({ message: "Not found" });

    const existing = rows[0];
    const nextAllow =
      allowAttendeeRequestProvided
        ? allowAttendeeRequestValue
          ? 1
          : 0
        : existing.allow_attendee_request ?? 0;

    const nextPrimaryVendor = vendorIdsProvided
      ? vendorIds[0] ?? null
      : existing.vendor_id ?? null;

    db.query(
      "UPDATE events SET event_name=?, created_by=?, venue_id=?, vendor_id=?, date=?, allow_attendee_request=? WHERE id=?",
      [
        event_name ?? existing.event_name,
        created_by ?? existing.created_by,
        venue_id ?? existing.venue_id,
        nextPrimaryVendor,
        date ?? existing.date,
        nextAllow,
        id
      ],
      (err2) => {
        if (err2) return res.status(500).json({ message: err2.message });
        if (!vendorIdsProvided) {
          return res.json({ message: "Event updated" });
        }
        replaceEventVendors(id, vendorIds, (err3) => {
          if (err3) return res.status(500).json({ message: err3.message });
          res.json({ message: "Event updated" });
        });
      }
    );
  });
};

exports.deleteEvent = (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM events WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Not found" });
    res.json({ message: "Event deleted" });
  });
};

exports.addAttendees = async (req, res) => {
  try {
    const { id } = req.params;
    let attendees = [];
    try {
      attendees = normalizeAttendeesInput(req.body.attendees);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    if (!attendees.length) {
      return res.status(400).json({ message: "No attendees provided" });
    }

    db.query("SELECT * FROM events WHERE id = ?", [id], async (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows?.length) return res.status(404).json({ message: "Not found" });

      const event = rows[0];
      const [capacity, currentCount] = await Promise.all([
        getVenueCapacity(event.venue_id),
        countEventAttendees(id)
      ]);

      if (currentCount + attendees.length > capacity) {
        return res.status(400).json({
          message: "Attendees exceed venue capacity",
          capacity,
          currentAttendees: currentCount,
          requestedAttendees: attendees.length
        });
      }

      await insertAttendees(id, attendees);
      const newCount = currentCount + attendees.length;
      return res.json({ message: "Attendees added", attendees_count: newCount });
    });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
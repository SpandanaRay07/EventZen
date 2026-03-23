const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Spandana@2",
  database: process.env.DB_NAME || "event_booking_db"
});

function initSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_name VARCHAR(255) NOT NULL,
      created_by VARCHAR(255) NOT NULL,
      venue_id INT NOT NULL,
      vendor_id INT NULL,
      date DATETIME NOT NULL,
      allow_attendee_request TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS event_attendees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      attendee_name VARCHAR(255) NULL,
      attendee_email VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_event_attendees_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NULL,
      venue_id INT NOT NULL,
      date DATETIME NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_bookings_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS attendee_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(64) NOT NULL,
      event_id INT NOT NULL,
      date DATETIME NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_attendee_requests_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS event_vendors (
      event_id INT NOT NULL,
      vendor_id INT NOT NULL,
      PRIMARY KEY (event_id, vendor_id),
      CONSTRAINT fk_event_vendors_event
        FOREIGN KEY (event_id) REFERENCES events(id)
        ON DELETE CASCADE
    )`
  ];

  const migrations = [
    "ALTER TABLE events ADD COLUMN allow_attendee_request TINYINT(1) NOT NULL DEFAULT 0",
    `INSERT IGNORE INTO event_vendors (event_id, vendor_id)
     SELECT id, vendor_id FROM events WHERE vendor_id IS NOT NULL`
  ];

  function runChain(queries, i) {
    if (i >= queries.length) return;
    db.query(queries[i], (err) => {
      if (err && err.code !== "ER_DUP_FIELDNAME") {
        console.error("Schema init failed:", err.message);
      }
      runChain(queries, i + 1);
    });
  }

  runChain([...statements, ...migrations], 0);
}

db.connect((err) => {
  if (err) {
    console.error("DB connection failed!", err.message);
    return;
  }
  console.log("Connected to MySQL");
  const shouldInitSchema =
    process.env.INIT_SCHEMA === "true" || process.env.INIT_SCHEMA === "1";
  if (shouldInitSchema) initSchema();
});

module.exports = db;
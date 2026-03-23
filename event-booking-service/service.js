require("dotenv").config();
const express = require("express");
const cors = require("cors");

const eventRoutes = require("./routes/eventRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminBookingRoutes = require("./routes/adminBookingRoutes");
const attendeeRequestRoutes = require("./routes/attendeeRequestRoutes");
const attendeeRoutes = require("./routes/attendeeRoutes");

const app = express();

// Enable CORS
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());

app.use("/events", eventRoutes);
app.use("/bookings", bookingRoutes);
app.use("/admin/bookings", adminBookingRoutes);
app.use("/attendee_requests", attendeeRequestRoutes);
app.use("/attendees", attendeeRoutes);

const PORT = process.env.PORT || 8083;

app.listen(PORT, () => {
  console.log(`Event Booking Service running on port ${PORT}`);
});
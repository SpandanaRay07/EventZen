const express = require("express");
const router = express.Router();

const {
  getBookings,
  getBookingById,
  approveBooking,
  rejectBooking
} = require("../controllers/bookingController");

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.put("/:id/approve", approveBooking);
router.put("/:id/reject", rejectBooking);

module.exports = router;


const express = require("express");
const router = express.Router();

const {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  approveBooking,
  rejectBooking
} = require("../controllers/bookingController");

router.post("/", createBooking);
router.get("/", getBookings);
router.get("/:id", getBookingById);
router.put("/:id", updateBooking);
router.put("/:id/cancel", cancelBooking);

router.put("/:id/approve", approveBooking);
router.put("/:id/reject", rejectBooking);

module.exports = router;


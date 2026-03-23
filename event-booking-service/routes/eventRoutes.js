const express = require("express");
const router = express.Router();

const {
  createEvent,
  getEvents,
  getEventById,
  getEventAttendeeRequests,
  updateEvent,
  deleteEvent,
  addAttendees
} = require("../controllers/eventController");

router.post("/", createEvent);
router.get("/", getEvents);
router.get("/:id", getEventById);
router.get("/:id/attendee_requests", getEventAttendeeRequests);
router.put("/:id", updateEvent);
router.delete("/:id", deleteEvent);

router.post("/:id/attendees", addAttendees);

module.exports = router;


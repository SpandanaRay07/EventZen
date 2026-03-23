const express = require("express");
const router = express.Router();

const {
  getAttendees,
  getAttendeeById
} = require("../controllers/attendeeController");

router.get("/", getAttendees);
router.get("/:id", getAttendeeById);

module.exports = router;

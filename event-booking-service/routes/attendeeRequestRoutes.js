const express = require("express");
const router = express.Router();

const {
  createAttendeeRequest,
  getAttendeeRequests,
  getAttendeeRequestById,
  updateAttendeeRequestStatus,
  acceptAttendeeRequest,
  rejectAttendeeRequest
} = require("../controllers/attendeeRequestController");

router.post("/", createAttendeeRequest);
router.get("/", getAttendeeRequests);
router.get("/:id", getAttendeeRequestById);
router.put("/:id", updateAttendeeRequestStatus);
router.put("/:id/accept", acceptAttendeeRequest);
router.put("/:id/reject", rejectAttendeeRequest);

module.exports = router;


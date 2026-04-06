const express = require("express");
const router = express.Router();

const {
  searchStudents,
  getStudentAnalytics,
  getAnalytics,
  getMonthlyTrends,
  getReminderStatus,
} = require("../Controllers/Admin");
const { verifyToken } = require("../Middlewares/Auth");
const { authorize } = require("../Middlewares/Role");

// Only admin
router.get(
  "/students/search",
  verifyToken,
  authorize("admin"),
  searchStudents
);

router.get(
  "/students/:studentId/analytics",
  verifyToken,
  authorize("admin"),
  getStudentAnalytics
);

router.get(
  "/analytics",
  verifyToken,
  authorize("admin"),
  getAnalytics
);

router.get(
  "/analytics/monthly-trends",
  verifyToken,
  authorize("admin"),
  getMonthlyTrends
);

router.get(
  "/reminders",
  verifyToken,
  authorize("admin"),
  getReminderStatus
);

module.exports = router;

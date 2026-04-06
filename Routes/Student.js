const express = require("express");
const router = express.Router();

const {
  updateCareer,
  getDashboard,
} = require("../Controllers/Student");
const { verifyToken } = require("../Middlewares/Auth");
const { authorize } = require("../Middlewares/Role");

// Only student allowed
router.post(
  "/update-career",
  verifyToken,
  authorize("student"),
  updateCareer
);

router.get(
  "/dashboard",
  verifyToken,
  authorize("student"),
  getDashboard
);

module.exports = router;
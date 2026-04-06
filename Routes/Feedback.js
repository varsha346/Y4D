const express = require("express");
const router = express.Router();

const { addFeedback } = require("../Controllers/Feedback");
const { verifyToken } = require("../Middlewares/Auth");
const { authorize } = require("../Middlewares/Role");

router.post(
  "/",
  verifyToken,
  authorize("student"),
  addFeedback
);

module.exports = router;

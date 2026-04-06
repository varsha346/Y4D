const express = require("express");
const router = express.Router();

const multer = require("multer");
const upload = multer({ dest: "uploads/" });

const { uploadExcel } = require("../Controllers/Upload");
const { verifyToken } = require("../Middlewares/Auth");
const { authorize } = require("../Middlewares/Role");

router.post(
  "/excel",
  verifyToken,
  authorize("admin", "data_entry"),
  upload.single("file"),
  uploadExcel
);

module.exports = router;
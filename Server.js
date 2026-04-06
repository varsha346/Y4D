require("dotenv").config();

const express = require("express");
const sequelize = require("./Config/Database");
require("./Models");
const { startReminderScheduler } = require("./Utils/ReminderScheduler");

const authRoutes = require("./Routes/Auth");
const studentRoutes = require("./Routes/Student");
const adminRoutes = require("./Routes/Admin");
const uploadRoutes = require("./Routes/Upload");
const feedbackRoutes = require("./Routes/Feedback");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Route mounting
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/feedback", feedbackRoutes);

sequelize
  .sync()
  .then(() => {
    console.log("DB Connected");
    startReminderScheduler();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to start server:", error.message);
    process.exit(1);
  });
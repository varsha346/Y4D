const { Op } = require("sequelize");
const { Reminder, Student, User } = require("../Models");
const { sendEmail } = require("./Mailer");

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

async function sendQuarterlyReminders() {
  const now = new Date();

  const dueReminders = await Reminder.findAll({
    where: {
      next_due: {
        [Op.lte]: now,
      },
    },
    include: [
      {
        model: Student,
        include: [User],
      },
    ],
  });

  for (const reminder of dueReminders) {
    const student = reminder.Student;
    const user = student && student.User;

    if (!user || !user.email) {
      continue;
    }

    try {
      await sendEmail({
        to: user.email,
        subject: "Y4D Profile Update Reminder",
        text:
          `Hi ${user.name || "Student"},\n\n` +
          "It has been 3 months since your last profile update.\n" +
          "Please log in to Y4D and update your career progress if there are any changes.\n\n" +
          "Regards,\nY4D Team",
      });

      await reminder.update({
        last_updated: now,
        next_due: addMonths(now, 3),
      });
    } catch (error) {
      // Intentionally continue so one failing email does not block all reminders.
      console.error(`Reminder email failed for ${user.email}:`, error.message);
    }
  }
}

function startReminderScheduler() {
  const intervalMs = Number(process.env.REMINDER_INTERVAL_MS || 24 * 60 * 60 * 1000);

  sendQuarterlyReminders().catch((error) => {
    console.error("Initial reminder check failed:", error.message);
  });

  setInterval(() => {
    sendQuarterlyReminders().catch((error) => {
      console.error("Scheduled reminder check failed:", error.message);
    });
  }, intervalMs);
}

module.exports = {
  startReminderScheduler,
  sendQuarterlyReminders,
};

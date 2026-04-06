const xlsx = require("xlsx");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { User, Student, CareerUpdate, Upload, Reminder } = require("../Models");
const { sendEmail } = require("../Utils/Mailer");

function createTempPassword() {
  return crypto.randomBytes(6).toString("base64url");
}

async function sendWelcomeEmail({ to, name, tempPassword }) {
  await sendEmail({
    to,
    subject: "Your Y4D Account Credentials",
    text:
      `Hi ${name || "Student"},\n\n` +
      "Your Y4D student account has been created from the latest upload.\n" +
      `Email: ${to}\n` +
      `Temporary Password: ${tempPassword}\n\n` +
      "Please log in and change your password immediately.\n\n" +
      "Regards,\nY4D Team",
  });
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

exports.uploadExcel = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ msg: "Excel file is required" });
    }

    const workbook = xlsx.readFile(file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);

    const mailResults = {
      sent: 0,
      failed: 0,
      failures: [],
    };

    for (let row of data) {
      const { name, email, course, company, salary, status } = row;

      if (!email) {
        continue;
      }

      let user = await User.findOne({ where: { email } });

      if (!user) {
        const tempPassword = createTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        user = await User.create({
          name,
          email,
          password: hashedPassword,
          role: "student",
        });

        const student = await Student.create({
          user_id: user.id,
          course,
        });

        const now = new Date();
        await Reminder.create({
          student_id: student.id,
          last_updated: now,
          next_due: addMonths(now, 3),
        });

        try {
          await sendWelcomeEmail({
            to: email,
            name,
            tempPassword,
          });
          mailResults.sent += 1;
        } catch (mailError) {
          mailResults.failed += 1;
          mailResults.failures.push({
            email,
            reason: mailError.message,
          });
        }
      }

      const student = await Student.findOne({
        where: { user_id: user.id },
      });

      if (student) {
        const existingReminder = await Reminder.findOne({
          where: { student_id: student.id },
        });

        if (!existingReminder) {
          const now = new Date();
          await Reminder.create({
            student_id: student.id,
            last_updated: now,
            next_due: addMonths(now, 3),
          });
        }
      }

      await CareerUpdate.create({
        student_id: student.id,
        company,
        salary,
        status,
        updated_at: new Date(),
      });
    }

    await Upload.create({
      uploaded_by: req.user.id,
      file_name: file.originalname,
    });

    res.json({
      msg: "Excel processed successfully",
      mail: mailResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



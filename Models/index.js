const User = require("./User");
const Student = require("./Student");
const Training = require("./Training");
const CareerUpdate = require("./Careerupdate");
const Feedback = require("./Feedback");
const Upload = require("./Upload");
const Reminder = require("./Reminder");

// User ↔ Student
User.hasOne(Student, { foreignKey: "user_id" });
Student.belongsTo(User, { foreignKey: "user_id" });

// Student ↔ Training
Student.hasMany(Training, { foreignKey: "student_id" });
Training.belongsTo(Student, { foreignKey: "student_id" });

// Student ↔ Career Updates
Student.hasMany(CareerUpdate, { foreignKey: "student_id" });
CareerUpdate.belongsTo(Student, { foreignKey: "student_id" });

// Student ↔ Feedback
Student.hasMany(Feedback, { foreignKey: "student_id" });
Feedback.belongsTo(Student, { foreignKey: "student_id" });

// User ↔ Upload
User.hasMany(Upload, { foreignKey: "uploaded_by" });
Upload.belongsTo(User, { foreignKey: "uploaded_by" });

// Student ↔ Reminder
Student.hasOne(Reminder, { foreignKey: "student_id" });
Reminder.belongsTo(Student, { foreignKey: "student_id" });

module.exports = {
  User,
  Student,
  Training,
  CareerUpdate,
  Feedback,
  Upload,
  Reminder,
};
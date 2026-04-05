const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const Student = sequelize.define("Student", {
  phone: DataTypes.STRING,
  gender: DataTypes.ENUM("male", "female", "other"),
  course: DataTypes.STRING,
  batch: DataTypes.STRING,
  enrollment_date: DataTypes.DATE,
}, {
  tableName: "students",
  timestamps: false
});

module.exports = Student;
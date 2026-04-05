const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const Training = sequelize.define("Training", {
  course_name: DataTypes.STRING,
  start_date: DataTypes.DATE,
  end_date: DataTypes.DATE,
  completion_status: DataTypes.ENUM("ongoing", "completed", "dropped"),
}, {
  tableName: "trainings",
  timestamps: false
});

module.exports = Training;
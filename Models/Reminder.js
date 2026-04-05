const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const Reminder = sequelize.define("Reminder", {
  last_updated: DataTypes.DATE,
  next_due: DataTypes.DATE,
}, {
  tableName: "update_reminders",
  timestamps: false
});

module.exports = Reminder;
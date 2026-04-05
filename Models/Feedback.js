const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const Feedback = sequelize.define("Feedback", {
  rating: DataTypes.INTEGER,
  comment: DataTypes.TEXT,
}, {
  tableName: "feedback",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false
});

module.exports = Feedback;
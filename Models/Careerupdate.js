const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const CareerUpdate = sequelize.define("CareerUpdate", {
  company: DataTypes.STRING,
  role: DataTypes.STRING,
  salary: DataTypes.FLOAT,
  status: DataTypes.ENUM("unemployed", "internship", "placed", "higher_studies"),
  location: DataTypes.STRING,
  updated_at: DataTypes.DATE,
}, {
  tableName: "career_updates",
  timestamps: false
});

module.exports = CareerUpdate;
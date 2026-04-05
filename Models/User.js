const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const User = sequelize.define("User", {
  name: DataTypes.STRING,
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  password: DataTypes.STRING,
  role: {
    type: DataTypes.ENUM("admin", "data_entry", "student"),
    allowNull: false,
  },
}, {
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false
});

module.exports = User;
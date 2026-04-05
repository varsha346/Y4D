const { DataTypes } = require("sequelize");
const sequelize = require("../Config/Database");

const Upload = sequelize.define("Upload", {
  file_name: DataTypes.STRING,
}, {
  tableName: "uploads",
  timestamps: true,
  createdAt: "uploaded_at",
  updatedAt: false
});

module.exports = Upload;
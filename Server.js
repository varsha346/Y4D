require("dotenv").config();

const express = require("express");
const sequelize = require("./Config/Database");
require("./Models");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
	res.status(200).json({ message: "Y4D API is running" });
});

app.get("/health", (req, res) => {
	res.status(200).json({ status: "ok" });
});

async function startServer() {
	try {
		await sequelize.authenticate();
		console.log("Database connection established successfully.");

		await sequelize.sync();
		console.log("Models synchronized successfully.");

		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Unable to start server:", error.message);
		process.exit(1);
	}
}

startServer();

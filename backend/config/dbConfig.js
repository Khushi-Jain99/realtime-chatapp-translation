const mongoose = require("mongoose");

// Connection logic
mongoose.connect(process.env.CONN_STRING);

// Connection state
const db = mongoose.connection;

// Checking DB connection status
db.on("connected", () => {
  console.log("DB connected successfully");
});
db.on("error", () => {
  console.log("DB connection failed");
});

module.exports = db;

// backend/db.js
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "trisha@2004", // Replace with your MySQL password
  database: "smart_cafe",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Error:", err.message);
    process.exit(1); // Stop the server if the database fails to connect
  }
  console.log("✅ MySQL Connected");
});

// Export the db connection so server.js can use it
module.exports = db;

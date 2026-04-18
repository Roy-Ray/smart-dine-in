const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ================= MYSQL =================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "trisha@2004", // keep your correct password
  database: "smart_cafe",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL Error:", err.message);
    process.exit(1);
  }
  console.log("✅ MySQL Connected");
});

// ================= API =================

// GET MENU
app.get("/api/menu", (req, res) => {
  db.query("SELECT * FROM menu", (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "DB error" });
    }
    res.json(result);
  });
});

// PLACE ORDER (dummy)
app.post("/api/order", (req, res) => {
  res.json({ message: "Order placed (dummy)" });
});

// ================= STATIC FILES =================

// serve frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../frontend")));

// 🔥 IMPORTANT: serve images folder explicitly
app.use("/image", express.static(path.join(__dirname, "../frontend/image")));

// default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ================= SERVER =================

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "your_super_secret_key";

// ================= STATIC FILES =================

// serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ FIXED: correct image folder path
app.use("/image", express.static(path.join(__dirname, "../image")));

app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000"),
);

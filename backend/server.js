// backend/server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Import the database connection from db.js
const db = require("./db"); 

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "your_super_secret_key"; // Keep this secure in a real app

// ================= MIDDLEWARE =================
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ error: "No token provided. Please log in." });
  
  jwt.verify(token.split(" ")[1], JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Unauthorized!" });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

// ================= AUTH API =================
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashedPassword], (err, result) => {
    if (err) return res.status(500).json({ error: "Email already exists" });
    res.json({ message: "Registered successfully!" });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ error: "User not found" });

    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, role: user.role, name: user.name });
  });
});

// ================= MENU & ORDERS API =================
app.get("/api/menu", (req, res) => {
  db.query("SELECT * FROM menu", (err, result) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(result);
  });
});

// Place Order & Fake Payment Gateway
app.post("/api/order", verifyToken, (req, res) => {
  const { itemId, amount } = req.body;
  
  // 1. Create Order
  db.query("INSERT INTO orders (user_id, item_id, status) VALUES (?, ?, 'pending')", [req.userId, itemId], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to place order" });
    
    const orderId = result.insertId;
    
    // 2. Create Payment Record
    db.query("INSERT INTO payments (order_id, user_id, amount) VALUES (?, ?, ?)", [orderId, req.userId, amount], (err) => {
      res.json({ message: "Payment successful and Order placed!" });
    });
  });
});

// Get Customer Dashboard Data
app.get("/api/my-dashboard", verifyToken, (req, res) => {
  const query = `
    SELECT o.id as order_id, m.name as item_name, o.status, p.amount, p.payment_date 
    FROM orders o 
    JOIN menu m ON o.item_id = m.id 
    JOIN payments p ON o.id = p.order_id 
    WHERE o.user_id = ? ORDER BY o.created_at DESC`;

  db.query(query, [req.userId], (err, results) => {
    res.json(results);
  });
});

// ================= ADMIN API =================
// Get all orders for Admin
app.get("/api/admin/orders", verifyToken, (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ error: "Admin only" });

  const query = `SELECT o.id, u.name as customer, m.name as item, o.status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id JOIN menu m ON o.item_id = m.id ORDER BY o.created_at DESC`;
  db.query(query, (err, results) => {
    res.json(results);
  });
});

// Update Order Status
app.put("/api/admin/order/:id/status", verifyToken, (req, res) => {
  if (req.userRole !== 'admin') return res.status(403).json({ error: "Admin only" });

  const { status } = req.body;
  db.query("UPDATE orders SET status = ? WHERE id = ?", [status, req.params.id], (err) => {
    res.json({ message: "Order status updated to " + status });
  });
});

// ================= STATIC FILES =================
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/image", express.static(path.join(__dirname, "../frontend/image")));

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
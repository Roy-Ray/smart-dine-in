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

// ================= API ROUTES =================

// 1. Fetch All Menu Items
app.get("/api/menu", (req, res) => {
  const sql = "SELECT * FROM menu_items";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results);
  });
});

// 2. User Registration
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Hash the password for security
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [name, email, hashedPassword], (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "Email already exists" });
      }
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ message: "User registered successfully" });
  });
});

// 3. User Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(401).json({ error: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      name: user.name,
    });
  });
});

// ================= MIDDLEWARE =================

// Verify JWT Token
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }
    req.userId = decoded.id;
    next();
  });
}

// ================= ORDER ROUTES =================

// 4. Create Order
app.post("/api/orders", verifyToken, (req, res) => {
  const { items, totalAmount, paymentMethod, status, paymentDetails } = req.body;
  const userId = req.userId;
  const orderId = `ORD-${Date.now()}`;
  const timestamp = new Date();

  // Validate input
  if (!items || items.length === 0 || !totalAmount) {
    return res.status(400).json({ error: "Invalid order data" });
  }

  // Check if orders table exists, if not create it
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      orderId VARCHAR(50) UNIQUE,
      userId INT,
      items JSON,
      totalAmount DECIMAL(10, 2),
      paymentMethod VARCHAR(50),
      paymentDetails JSON,
      status VARCHAR(50),
      timestamp DATETIME,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `;

  db.query(createTableSQL, (err) => {
    if (err) {
      console.error("Error creating orders table:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Insert order
    const insertSQL = `
      INSERT INTO orders (orderId, userId, items, totalAmount, paymentMethod, paymentDetails, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertSQL,
      [
        orderId,
        userId,
        JSON.stringify(items),
        totalAmount,
        paymentMethod,
        JSON.stringify(paymentDetails),
        status,
        timestamp,
      ],
      (err, result) => {
        if (err) {
          console.error("Error inserting order:", err);
          return res.status(500).json({ error: "Failed to create order" });
        }

        res.status(201).json({
          message: "Order created successfully",
          orderId: orderId,
          totalAmount: totalAmount,
          paymentMethod: paymentMethod,
        });
      }
    );
  });
});

// 5. Get User's Orders
app.get("/api/orders", verifyToken, (req, res) => {
  const userId = req.userId;

  const sql = "SELECT * FROM orders WHERE userId = ? ORDER BY timestamp DESC";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Parse JSON fields
    const orders = results.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      paymentDetails: JSON.parse(order.paymentDetails),
    }));

    res.json(orders);
  });
});

// 6. Get Single Order Details
app.get("/api/orders/:orderId", verifyToken, (req, res) => {
  const { orderId } = req.params;
  const userId = req.userId;

  const sql = "SELECT * FROM orders WHERE orderId = ? AND userId = ?";

  db.query(sql, [orderId, userId], (err, results) => {
    if (err) {
      console.error("Error fetching order:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = {
      ...results[0],
      items: JSON.parse(results[0].items),
      paymentDetails: JSON.parse(results[0].paymentDetails),
    };

    res.json(order);
  });
});

// 7. Update Order Status (for admin/system)
app.patch("/api/orders/:orderId/status", verifyToken, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const sql = "UPDATE orders SET status = ? WHERE orderId = ?";

  db.query(sql, [status, orderId], (err, result) => {
    if (err) {
      console.error("Error updating order:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order status updated successfully", status });
  });
});

// ================= STATIC FILES =================

// serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// correct image folder path
app.use("/image", express.static(path.join(__dirname, "../image")));

app.listen(5000, () =>
  console.log("🚀 Server running on http://localhost:5000"),
);

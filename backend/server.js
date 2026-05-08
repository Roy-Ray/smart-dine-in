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
  const { items, totalAmount, paymentMethod, status, paymentDetails, orderType, tableNumber } = req.body;
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
      orderType VARCHAR(50),
      tableNumber INT,
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
      INSERT INTO orders (orderId, userId, items, totalAmount, paymentMethod, paymentDetails, status, orderType, tableNumber, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        orderType,
        tableNumber,
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

// ================= ADMIN ROUTES =================

// 8. Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role are required" });
  }

  // Create admins table if not exists
  const createAdminTableSQL = `
    CREATE TABLE IF NOT EXISTS admins (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      password VARCHAR(255),
      name VARCHAR(255),
      role VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.query(createAdminTableSQL, (err) => {
    if (err) {
      console.error("Error creating admins table:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Check if default admin exists, if not create it
    const checkAdminSQL = "SELECT * FROM admins WHERE email = ?";
    db.query(checkAdminSQL, [email], async (err, results) => {
      if (err) {
        console.error("Error checking admin:", err);
        return res.status(500).json({ error: "Database error" });
      }

      let admin = results[0];

      // If no admin found and trying demo credentials, create it
      if (!admin && email === "admin@smartdine.com" && password === "Admin@123") {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertSQL =
          "INSERT INTO admins (email, password, name, role) VALUES (?, ?, ?, ?)";
        db.query(
          insertSQL,
          [email, hashedPassword, "Admin", "admin"],
          (insertErr) => {
            if (insertErr && insertErr.code !== "ER_DUP_ENTRY") {
              return res.status(500).json({ error: "Database error" });
            }
            // Retry login
            handleAdminLoginLogic(email, password, role, res);
          }
        );
      } else if (admin) {
        handleAdminLoginLogic(email, password, role, res);
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    });
  });
});

// Admin login logic
function handleAdminLoginLogic(email, password, role, res) {
  const sql = "SELECT * FROM admins WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (results.length === 0)
      return res.status(401).json({ error: "Admin not found" });

    const admin = results[0];

    if (admin.role !== role && role !== "admin") {
      // Allow any role to login as their requested role (flexibility)
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, role: admin.role, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      message: "Admin login successful",
      token,
      role: role || admin.role,
      name: admin.name,
    });
  });
}

// Verify Admin Token
function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded.isAdmin) {
      return res.status(403).json({ error: "Invalid admin token" });
    }
    req.adminId = decoded.id;
    req.adminRole = decoded.role;
    next();
  });
}

// 9. Get All Orders (Admin)
app.get("/api/admin/orders", verifyAdminToken, (req, res) => {
  const sql = `
    SELECT o.*, u.name as userName, u.email 
    FROM orders o
    LEFT JOIN users u ON o.userId = u.id
    ORDER BY o.timestamp DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const orders = results.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      paymentDetails: JSON.parse(order.paymentDetails),
    }));

    res.json(orders);
  });
});

// 10. Get Orders by Table (Admin)
app.get("/api/admin/tables/:tableNumber", verifyAdminToken, (req, res) => {
  const { tableNumber } = req.params;

  const sql =
    "SELECT * FROM orders WHERE tableNumber = ? AND orderType = 'dine-in' ORDER BY timestamp DESC";

  db.query(sql, [tableNumber], (err, results) => {
    if (err) {
      console.error("Error fetching table orders:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const orders = results.map((order) => ({
      ...order,
      items: JSON.parse(order.items),
      paymentDetails: JSON.parse(order.paymentDetails),
    }));

    res.json(orders);
  });
});

// 11. Update Order Status (Admin)
app.patch("/api/admin/orders/:orderId/status", verifyAdminToken, (req, res) => {
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

// 12. Get Revenue Stats (Admin)
app.get("/api/admin/stats", verifyAdminToken, (req, res) => {
  const todayDate = new Date().toISOString().split("T")[0];

  const sql = `
    SELECT 
      COUNT(*) as totalOrders,
      SUM(totalAmount) as totalRevenue,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completedOrders,
      COUNT(CASE WHEN orderType = 'dine-in' THEN 1 END) as dineInOrders,
      COUNT(CASE WHEN orderType = 'takeaway' THEN 1 END) as takeawayOrders
    FROM orders
    WHERE DATE(timestamp) = ?
  `;

  db.query(sql, [todayDate], (err, results) => {
    if (err) {
      console.error("Error fetching stats:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results[0]);
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

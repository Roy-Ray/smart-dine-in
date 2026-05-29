// admin-dashboard.js

let allOrders = [];
let filteredOrders = [];
const STATUSES = {
  "dine-in": ["preparing", "ready", "served"],
  takeaway: ["preparing", "ready", "out-for-delivery", "delivered"],
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  checkAdminAuth();
  setupDashboard();
  loadAllOrders();
  setInterval(loadAllOrders, 5000); // Refresh every 5 seconds
});

// Check admin authentication
function checkAdminAuth() {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) {
    window.location.href = "/admin-login.html";
    return;
  }

  // Display admin info
  document.getElementById("adminUserName").textContent =
    localStorage.getItem("adminName") || "Admin";
  document.getElementById("adminRoleDisplay").textContent =
    localStorage.getItem("adminRole") || "Admin";
}

// Setup dashboard
function setupDashboard() {
  // Setup menu links
  document.querySelectorAll(".menu-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = link.getAttribute("data-section");
      switchSection(section);

      // Update active state
      document.querySelectorAll(".menu-link").forEach((l) => {
        l.classList.remove("active");
      });
      link.classList.add("active");
    });
  });

  // Setup filters
  document
    .getElementById("filterDate")
    .addEventListener("change", filterOrders);
  document
    .getElementById("statusFilter")
    .addEventListener("change", filterOrders);
  document
    .getElementById("searchOrder")
    .addEventListener("input", searchOrders);
  document
    .getElementById("searchOrderAdmin")
    .addEventListener("input", searchOrdersAdmin);
}

// Switch section
function switchSection(section) {
  const sections = [
    "overviewSection",
    "ordersSection",
    "tablesSection",
    "paymentsSection",
    "reportsSection",
    "menuSection",
    "offersSection",
  ];

  sections.forEach((s) => {
    const el = document.getElementById(s);
    if (el) {
      el.style.display = "none";
    }
  });

  document.querySelectorAll(".menu-link").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(
    `.menu-link[data-section="${section}"]`
  );

  if (activeLink) {
    activeLink.classList.add("active");
  }

  const titleMap = {
    overview: "Dashboard Overview",
    orders: "Order Management",
    tables: "Table Management",
    payments: "Payment Analytics",
    reports: "Reports & Insights",
    menu: "Menu Management",
    offers: "Offers & Promotions",
  };

  const sectionElement = document.getElementById(
    section + "Section"
  );

  if (sectionElement) {
    sectionElement.style.display = "block";
  }

  document.getElementById("pageTitle").textContent =
    titleMap[section];

  if (section === "tables") {
    displayTableStatus();
  }

  if (section === "payments") {
    displayPayments();
  }
}

// Load all orders from backend
async function loadAllOrders() {
  try {
    const adminToken = localStorage.getItem("adminToken");
    const response = await fetch("/api/admin/orders", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        adminLogout();
        return;
      }
      throw new Error("Failed to load orders");
    }

    allOrders = await response.json();
    filteredOrders = allOrders;

    // Update stats
    updateStats();

    // Display orders
    displayOrderQueue();
    displayTableView();
    displayAllOrders();
  } catch (error) {
    console.error("Error loading orders:", error);
  }
}

// Update dashboard stats
function updateStats() {
  const preparingOrders = allOrders.filter((o) => o.status === "preparing");
  const completedOrders = allOrders.filter((o) =>
    ["served", "delivered"].includes(o.status),
  );
  const totalRevenue = allOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );

  document.getElementById("pendingCount").textContent = preparingOrders.length;
  document.getElementById("completedCount").textContent =
    completedOrders.length;
  document.getElementById("revenueAmount").textContent =
    `₹${totalRevenue.toFixed(2)}`;
}

// Display order queue
function displayOrderQueue() {
  const container = document.getElementById("orderQueueContainer");
  const preparing = filteredOrders.filter((o) => o.status === "preparing");

  if (preparing.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><i class="fas fa-inbox"></i><p>No orders being prepared</p></div>';
    return;
  }

  container.innerHTML = preparing
    .map((order) => createOrderCardHTML(order))
    .join("");
}

// Create order card HTML
function createOrderCardHTML(order) {
  const itemsHtml = order.items
    .map(
      (item) =>
        `<div class="order-item"><span>${item.name} x${item.quantity}</span><span>₹${(item.price * item.quantity).toFixed(2)}</span></div>`,
    )
    .join("");

  const tableInfo =
    order.orderType === "dine-in"
      ? `<strong>Table:</strong> ${order.tableNumber}`
      : `<strong>Order Type:</strong> Take Away`;

  return `
    <div class="order-card">
      <div class="order-info">
        <div class="order-header">
          <span class="order-id">${order.orderId}</span>
          <span class="order-type-badge ${order.orderType}">${
            order.orderType === "dine-in" ? "🍽️ Dine-In" : "🛍️ Take Away"
          }</span>
        </div>
        <div class="order-details">
          <div class="detail-row">${tableInfo}</div>
          <div class="detail-row"><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()}</div>
          <div class="detail-row"><strong>Amount:</strong> ₹${order.totalAmount.toFixed(2)}</div>
        </div>
        <div class="order-items">${itemsHtml}</div>
      </div>
      <div class="order-actions">
        <select class="status-select" onchange="updateOrderStatus('${order.orderId}', this.value, '${order.orderType}')">
          ${STATUSES[order.orderType]
            .map(
              (status) =>
                `<option value="${status}" ${order.status === status ? "selected" : ""}>${
                  status.charAt(0).toUpperCase() + status.slice(1)
                }</option>`,
            )
            .join("")}
        </select>
        <button class="btn-small btn-print" onclick="printOrder('${order.orderId}')">
          <i class="fas fa-print"></i> Print
        </button>
      </div>
    </div>
  `;
}

// Update order status
async function updateOrderStatus(orderId, newStatus, orderType) {
  try {
    const adminToken = localStorage.getItem("adminToken");
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error("Failed to update status");
    }

    // Reload orders
    loadAllOrders();
    showNotification(
      `Order ${orderId} status updated to ${newStatus}`,
      "success",
    );
  } catch (error) {
    console.error("Error updating status:", error);
    showNotification("Failed to update order status", "error");
  }
}

// Display table view
function displayTableView() {
  const tbody = document.getElementById("ordersTableBody");
  tbody.innerHTML = filteredOrders
    .map(
      (order) => `
    <tr>
      <td><strong>${order.orderId}</strong></td>
      <td><span class="order-type-badge ${order.orderType}">${
        order.orderType === "dine-in" ? "Dine-In" : "Take Away"
      }</span></td>
      <td>${order.orderType === "dine-in" ? `Table ${order.tableNumber}` : "N/A"}</td>
      <td>${order.items.map((i) => `${i.name} (${i.quantity})`).join(", ")}</td>
      <td>₹${order.totalAmount.toFixed(2)}</td>
      <td><span class="status-badge ${order.status}">${order.status}</span></td>
      <td>${order.paymentMethod}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${order.orderId}', this.value, '${order.orderType}')" style="font-size: 0.85rem;">
          ${STATUSES[order.orderType]
            .map(
              (status) =>
                `<option value="${status}" ${order.status === status ? "selected" : ""}>${
                  status.charAt(0).toUpperCase() + status.slice(1)
                }</option>`,
            )
            .join("")}
        </select>
      </td>
    </tr>
  `,
    )
    .join("");
}

// Display all orders
function displayAllOrders() {
  const container = document.getElementById("allOrdersContainer");
  if (filteredOrders.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><i class="fas fa-inbox"></i><p>No orders found</p></div>';
    return;
  }

  container.innerHTML = filteredOrders
    .map((order) => createOrderCardHTML(order))
    .join("");
}

// Display table status
function displayTableStatus() {
  const container = document.getElementById("tablesContainer");
  container.innerHTML = "";

  for (let i = 1; i <= 12; i++) {
    const tableOrders = allOrders.filter(
      (o) =>
        o.orderType === "dine-in" &&
        o.tableNumber === i &&
        o.status !== "served",
    );
    const status = tableOrders.length > 0 ? "occupied" : "available";
    const bgColor = status === "occupied" ? "#fff3cd" : "#d4edda";
    const textColor = status === "occupied" ? "#ff9800" : "#4caf50";

    const html = `
      <div style="background: ${bgColor}; color: ${textColor}; padding: 1.5rem; border-radius: 8px; text-align: center; font-weight: 600;">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">Table ${i}</div>
        <div style="font-size: 0.85rem;">${status === "occupied" ? "Occupied" : "Available"}</div>
        ${
          tableOrders.length > 0
            ? `<div style="font-size: 0.75rem; margin-top: 0.5rem;">${tableOrders[0].orderId}</div>`
            : ""
        }
      </div>
    `;
    container.innerHTML += html;
  }
}

// Display payments
function displayPayments() {
  const tbody = document.getElementById("paymentsTableBody");
  tbody.innerHTML = allOrders
    .map(
      (order) => `
    <tr>
      <td>${order.orderId}</td>
      <td>₹${order.totalAmount.toFixed(2)}</td>
      <td>${order.paymentMethod.toUpperCase()}</td>
      <td>${order.status === "completed" ? "Paid" : "Pending"}</td>
      <td>${new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  `,
    )
    .join("");
}

// Filter orders
function filterOrders() {
  const date = document.getElementById("filterDate").value;
  const status = document.getElementById("statusFilter").value;

  filteredOrders = allOrders.filter((order) => {
    if (date) {
      const orderDate = new Date(order.timestamp).toISOString().split("T")[0];
      if (orderDate !== date) return false;
    }
    if (status && order.status !== status) return false;
    return true;
  });

  displayOrderQueue();
  displayTableView();
}

// Search orders
function searchOrders() {
  const search = document.getElementById("searchOrder").value.toLowerCase();
  filteredOrders = allOrders.filter(
    (order) =>
      order.orderId.toLowerCase().includes(search) ||
      (order.tableNumber && order.tableNumber.toString().includes(search)),
  );
  displayOrderQueue();
}

// Search orders (admin section)
function searchOrdersAdmin() {
  const search = document
    .getElementById("searchOrderAdmin")
    .value.toLowerCase();
  filteredOrders = allOrders.filter((order) =>
    order.orderId.toLowerCase().includes(search),
  );
  displayAllOrders();
}

// Switch view
function switchView(view) {
  if (view === "queue") {
    document.getElementById("queueView").style.display = "block";
    document.getElementById("tableView").style.display = "none";
  } else {
    document.getElementById("queueView").style.display = "none";
    document.getElementById("tableView").style.display = "block";
  }
}

// Print order
function printOrder(orderId) {
  const order = allOrders.find((o) => o.orderId === orderId);
  if (!order) return;

  const printContent = `
    <div style="font-family: Arial; padding: 20px; text-align: center;">
      <h2>Smart Dine-In</h2>
      <h3>Order Receipt</h3>
      <p>Order ID: <strong>${order.orderId}</strong></p>
      <p>Type: <strong>${order.orderType === "dine-in" ? `Table ${order.tableNumber}` : "Take Away"}</strong></p>
      <hr>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><th style="text-align: left;">Item</th><th style="text-align: right;">Qty</th><th style="text-align: right;">Price</th></tr>
        ${order.items.map((item) => `<tr><td>${item.name}</td><td style="text-align: center;">${item.quantity}</td><td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td></tr>`).join("")}
      </table>
      <hr>
      <p>Total: <strong>₹${order.totalAmount.toFixed(2)}</strong></p>
      <p>Payment: ${order.paymentMethod}</p>
      <p>Status: ${order.status}</p>
    </div>
  `;

  const printWindow = window.open("", "", "height=600,width=600");
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
}

// Refresh orders
function refreshOrders() {
  loadAllOrders();
  showNotification("Orders refreshed", "success");
}

// Show notification
function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    background: ${type === "success" ? "#4caf50" : "#e74c3c"};
    color: white;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Admin logout
function adminLogout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminRole");
  localStorage.removeItem("adminName");
  window.location.href = "/admin-login.html";
}
// ==========================================
// MENU MANAGEMENT & OFFERS MANAGEMENT
// ==========================================

let currentOffers = [];

document.addEventListener("DOMContentLoaded", () => {
  const addProductForm = document.getElementById("addProductForm");
  if (addProductForm) {
    addProductForm.addEventListener("submit", handleAddProduct);
  }
  loadOffers(); // Fetch initial offers on load
});

async function handleAddProduct(e) {
  e.preventDefault();
  const name = document.getElementById("newProductName").value;
  const price = document.getElementById("newProductPrice").value;
  const description = document.getElementById("newProductDesc").value;
  const image = document.getElementById("newProductImage").value;

  const adminToken = localStorage.getItem("adminToken");
  const msgDiv = document.getElementById("productMsg");

  try {
    const response = await fetch("/api/admin/menu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, price, description, image }),
    });

    if (response.ok) {
      msgDiv.style.color = "green";
      msgDiv.textContent = "Product added successfully!";
      document.getElementById("addProductForm").reset();
      setTimeout(() => (msgDiv.textContent = ""), 3000);
    } else {
      const data = await response.json();
      msgDiv.style.color = "red";
      msgDiv.textContent = data.error || "Failed to add product";
    }
  } catch (error) {
    msgDiv.style.color = "red";
    msgDiv.textContent = "Error adding product.";
  }
}

async function loadOffers() {
  try {
    const response = await fetch("/api/offers");
    if (response.ok) {
      const data = await response.json();
      currentOffers = data.map((o) => o.message);
      renderOffersList();
    }
  } catch (error) {
    console.error("Failed to load offers", error);
  }
}

function renderOffersList() {
  const list = document.getElementById("offersList");
  if (!list) return;

  list.innerHTML = "";
  currentOffers.forEach((offer, index) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.justifyContent = "space-between";
    div.style.alignItems = "center";
    div.style.background = "#f8f9fa";
    div.style.padding = "0.8rem";
    div.style.border = "1px solid #ddd";
    div.style.borderRadius = "4px";

    const text = document.createElement("span");
    text.textContent = offer;
    text.style.fontWeight = "500";

    const btn = document.createElement("button");
    btn.innerHTML = '<i class="fas fa-trash"></i>';
    btn.style.color = "#e74c3c";
    btn.style.background = "none";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "1.2rem";
    btn.onclick = () => {
      currentOffers.splice(index, 1);
      renderOffersList();
    };

    div.appendChild(text);
    div.appendChild(btn);
    list.appendChild(div);
  });
}

function addOfferLine() {
  const input = document.getElementById("newOfferText");
  const text = input.value.trim();
  if (text) {
    currentOffers.push(text);
    input.value = "";
    renderOffersList();
  }
}

async function saveOffers() {
  const adminToken = localStorage.getItem("adminToken");
  const msgDiv = document.getElementById("offersMsg");
  msgDiv.style.color = "#27ae60";
  msgDiv.textContent = "Saving...";

  try {
    const response = await fetch("/api/admin/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ offers: currentOffers }),
    });

    if (response.ok) {
      msgDiv.textContent = "Offers successfully saved to the live website!";
      setTimeout(() => (msgDiv.textContent = ""), 3000);
    } else {
      msgDiv.style.color = "red";
      msgDiv.textContent = "Failed to save offers";
    }
  } catch (error) {
    msgDiv.style.color = "red";
    msgDiv.textContent = "Error saving offers.";
  }
}

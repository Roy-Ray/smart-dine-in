// frontend/order-tracking.js

document.addEventListener("DOMContentLoaded", () => {
  // Get order ID from the URL (e.g., ?id=ORD-123456)
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");

  if (!orderId) {
    document.getElementById("orderTrackingContent").innerHTML = `
      <div class="no-order">No Order ID provided. Please return to the menu.</div>
    `;
    return;
  }

  fetchOrderDetails(orderId);
});

async function fetchOrderDetails(orderId) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch order details");
    }

    const order = await response.json();
    renderOrderTracking(order);
  } catch (error) {
    document.getElementById("orderTrackingContent").innerHTML = `
      <div class="no-order">Error loading order: ${error.message}</div>
    `;
  }
}

function renderOrderTracking(order) {
  const content = document.getElementById("orderTrackingContent");
  const isDineIn = order.orderType === "dine-in";
  
  // Define steps based on the order type matching your admin dashboard
  const statuses = isDineIn
    ? ["preparing", "ready", "served"]
    : ["preparing", "ready", "out-for-delivery", "delivered"];

  const statusLabels = isDineIn
    ? ["Preparing", "Ready", "Served"]
    : ["Preparing", "Ready", "Out for Delivery", "Delivered"];

  const icons = isDineIn
    ? ['<i class="fa-solid fa-fire-burner"></i>', '<i class="fa-solid fa-bell"></i>', '<i class="fa-solid fa-utensils"></i>']
    : ['<i class="fa-solid fa-box"></i>', '<i class="fa-solid fa-check"></i>', '<i class="fa-solid fa-motorcycle"></i>', '<i class="fa-solid fa-house"></i>'];

  const currentStatusIndex = statuses.indexOf(order.status) !== -1 ? statuses.indexOf(order.status) : 0;

  // Generate Status Steps HTML
  let stepsHtml = '<div class="status-steps">';
  for (let i = 0; i < statuses.length; i++) {
    const activeClass = i <= currentStatusIndex ? "active" : "";
    stepsHtml += `<div class="step ${activeClass}">${icons[i]}</div>`;
  }
  stepsHtml += '</div><div class="step-labels">';
  for (let i = 0; i < statuses.length; i++) {
    const activeClass = i <= currentStatusIndex ? "active" : "";
    stepsHtml += `<span class="${activeClass}">${statusLabels[i]}</span>`;
  }
  stepsHtml += '</div>';

  // Generate Order Items HTML
  let itemsHtml = '<ul class="order-items">';
  order.items.forEach(item => {
    itemsHtml += `<li><span>${item.name} x${item.quantity}</span> <span>₹${(item.price * item.quantity).toFixed(2)}</span></li>`;
  });
  itemsHtml += '</ul>';

  // Render everything to the DOM
  content.innerHTML = `
    <div class="order-id">Order ${order.orderId}</div>
    <div class="order-details">
      Type: <strong>${isDineIn ? `Dine-In (Table ${order.tableNumber})` : 'Takeaway'}</strong><br>
      Payment: <strong>${order.paymentMethod.toUpperCase()}</strong>
    </div>
    ${stepsHtml}
    <h4 style="margin-top: 20px; color: #444; font-weight: 600;">Order Items</h4>
    ${itemsHtml}
    <div class="order-total">Total: ₹${parseFloat(order.totalAmount).toFixed(2)}</div>
  `;
}

function refreshOrderStatus() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("id");
  if (orderId) {
    const btn = document.querySelector('.refresh-btn');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';
    
    fetchOrderDetails(orderId).then(() => {
      setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Refresh';
      }, 500);
    });
  }
}
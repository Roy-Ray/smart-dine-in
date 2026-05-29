// payment.js
let cart = [];
let allMenuItems = [];
let selectedOrderType = "dine-in";
let selectedTable = null;
let currentOrderId = null; // Variable to store generated order ID

const cartStorageKey = () =>
  `cart_${localStorage.getItem("userName") || "guest"}`;
const lastCartOwnerKey = "lastCartOwner";

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
  checkAuth();
  await loadMenuItems();
  loadCart();
  setupEventListeners();
  generateTableNumbers();
});

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    window.location.href = "/login.html";
    return;
  }
}

// Load all menu items for reference
async function loadMenuItems() {
  try {
    const res = await fetch("/api/menu");
    allMenuItems = await res.json();
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

function saveCart() {
  localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
  localStorage.setItem(
    lastCartOwnerKey,
    localStorage.getItem("userName") || "",
  );
}

// Load cart from sessionStorage or localStorage
function loadCart() {
  let cartData = sessionStorage.getItem("checkoutItem");

  // If a single item was added from menu
  if (cartData) {
    const item = JSON.parse(cartData);
    const menuItem = allMenuItems.find((m) => m.id === item.itemId);
    if (menuItem) {
      cart = [
        {
          id: menuItem.id,
          name: menuItem.name,
          price: parseFloat(menuItem.price),
          quantity: 1,
          image: menuItem.image,
        },
      ];
    }
    sessionStorage.removeItem("checkoutItem");
  }

  const savedCart = localStorage.getItem(cartStorageKey());
  if (savedCart) {
    cart = JSON.parse(savedCart);
    cart = cart.map((item) => ({
      ...item,
      price: parseFloat(item.price),
      quantity: parseInt(item.quantity),
    }));
  } else {
    const legacy = localStorage.getItem("dineInCart");
    const lastOwner = localStorage.getItem(lastCartOwnerKey);
    const currentUser = localStorage.getItem("userName");
    if (legacy && lastOwner && currentUser && lastOwner === currentUser) {
      cart = JSON.parse(legacy).map((item) => ({
        ...item,
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity),
      }));
      saveCart();
      localStorage.removeItem("dineInCart");
    }
  }

  console.log("Cart loaded:", cart);
  displayCart();
  updateBillingTotal();
}

// Display cart items
function displayCart() {
  const cartContainer = document.getElementById("cartItems");
  const cartCount = document.getElementById("cartCount");

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <i class="fas fa-shopping-cart"></i>
        <h3>Your cart is empty</h3>
        <p>Add items from the menu to get started</p>
      </div>
    `;
    cartCount.textContent = "0";
    return;
  }

  let html = "";
  cart.forEach((item) => {
    const price = parseFloat(item.price);
    const itemTotal = (price * item.quantity).toFixed(2);
    html += `
      <div class="cart-item" id="item-${item.id}">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">₹${price.toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
          <span class="qty-display">${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
        </div>
        <div class="item-total">₹${itemTotal}</div>
        <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Remove">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });

  cartContainer.innerHTML = html;
  cartCount.textContent = cart.length;
}

// Update item quantity
function updateQuantity(itemId, change) {
  const item = cart.find((i) => i.id === itemId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(itemId);
    } else {
      saveCart();
      displayCart();
      updateBillingTotal();
    }
  }
}

// Remove item from cart
function removeFromCart(itemId) {
  cart = cart.filter((i) => i.id !== itemId);
  saveCart();
  displayCart();
  updateBillingTotal();
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem(cartStorageKey(), JSON.stringify(cart));
  localStorage.setItem(
    lastCartOwnerKey,
    localStorage.getItem("userName") || "",
  );
}

// Update billing total
function updateBillingTotal() {
  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0,
  );
  const tax = subtotal * 0.18;
  const delivery =
    selectedOrderType === "takeaway" ? (subtotal > 500 ? 0 : 40) : 0;
  const discount =
    parseFloat(
      document.getElementById("discount").textContent.replace("₹", ""),
    ) || 0;
  const total = subtotal + tax + delivery - discount;

  document.getElementById("subtotal").textContent = `₹${subtotal.toFixed(2)}`;
  document.getElementById("tax").textContent = `₹${tax.toFixed(2)}`;
  document.getElementById("delivery").textContent =
    delivery === 0 ? "FREE" : `₹${delivery.toFixed(2)}`;
  document.getElementById("totalAmount").textContent = `₹${total.toFixed(2)}`;
  document.getElementById("payAmount").textContent = total.toFixed(2);
}

// Show payment form based on selected method
function showPaymentForm(method) {
  // Hide all forms
  document.querySelectorAll(".payment-form").forEach((form) => {
    form.classList.remove("active");
  });

  // Remove selected class from all options
  document.querySelectorAll(".method-option").forEach((option) => {
    option.classList.remove("selected");
  });

  // Show selected form
  const formId = `${method}-form`;
  const form = document.getElementById(formId);
  if (form) {
    form.classList.add("active");
  }

  // Add selected class to current option
  const selectedOption = document.querySelector(
    `input[value="${method}"]`,
  ).parentElement;
  selectedOption.classList.add("selected");

  // Clear error message
  hideError();
}

// Setup event listeners
function setupEventListeners() {
  document.getElementById("logoutBtn").addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

// Generate table numbers for dine-in
function generateTableNumbers() {
  const tableGrid = document.getElementById("tableGrid");
  tableGrid.innerHTML = "";

  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "table-btn";
    btn.textContent = `Table ${i}`;
    btn.onclick = () => selectTable(i, btn);
    tableGrid.appendChild(btn);
  }

  // Select first table by default
  selectTable(1, tableGrid.firstChild);
}

// Select order type
function selectOrderType(type) {
  selectedOrderType = type;

  document
    .querySelectorAll(".order-type-btn")
    .forEach((btn) => btn.classList.remove("active"));

  if (type === "dine-in") {
    document.getElementById("dineInBtn").classList.add("active");
  } else {
    document.getElementById("deliveryBtn").classList.add("active");
  }
}
// Select table number
function selectTable(tableNum, element) {
  selectedTable = tableNum;

  // Update UI
  document
    .querySelectorAll(".table-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  element.classList.add("selected");
}

function logout() {
  saveCart();
  localStorage.removeItem("token");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
  localStorage.removeItem("dineInCart");
  window.location.href = "/login.html";
}

// Go back to menu
function goBackToMenu() {
  window.location.href = "/menu.html";
}

// Apply promo code
function applyPromo() {
  const code = document.getElementById("promoCode").value.toUpperCase();
  const subtotal = parseFloat(
    document.getElementById("subtotal").textContent.replace("₹", ""),
  );

  const promoCodes = {
    WELCOME50: 50,
    DINE100: 100,
    LUCKY20: subtotal * 0.2, // 20% discount
    FLAT30: 30,
  };

  if (promoCodes[code]) {
    const discount = promoCodes[code];
    document.getElementById("discount").textContent = `₹${discount.toFixed(2)}`;
    showMessage("Promo code applied successfully!", "success");
  } else if (code) {
    showMessage("Invalid promo code", "error");
  }

  updateBillingTotal();
}

// Show error message
function showError(msg) {
  const errorDiv = document.getElementById("errorMsg");
  errorDiv.textContent = msg;
  errorDiv.classList.add("show");
}

// Hide error message
function hideError() {
  document.getElementById("errorMsg").classList.remove("show");
}

// Show message (temporary)
function showMessage(msg, type) {
  const errorDiv = document.getElementById("errorMsg");
  errorDiv.textContent = msg;
  errorDiv.style.background =
    type === "success"
      ? "rgba(16, 185, 129, 0.12)"
      : "rgba(248, 113, 113, 0.12)";
  errorDiv.style.borderColor = type === "success" ? "#10b981" : "#f87171";
  errorDiv.style.color = type === "success" ? "#d1fae5" : "#fee2e2";
  errorDiv.classList.add("show");

  setTimeout(() => errorDiv.classList.remove("show"), 3000);
}

// Validate payment details based on method
function validatePaymentDetails() {
  const method = document.querySelector('input[name="paymentMethod"]:checked');

  if (!method) {
    showError("Please select a payment method");
    return false;
  }

  const paymentMethod = method.value;

  switch (paymentMethod) {
    case "upi":
      const upiId = document.getElementById("upiId").value.trim();
      if (!upiId || !upiId.includes("@")) {
        showError("Please enter a valid UPI ID");
        return false;
      }
      break;

    case "card":
      const cardNumber = document.getElementById("cardNumber").value.trim();
      const cardExpiry = document.getElementById("cardExpiry").value.trim();
      const cardCVV = document.getElementById("cardCVV").value.trim();
      const cardName = document.getElementById("cardName").value.trim();

      if (!cardNumber || cardNumber.length !== 16) {
        showError("Card number must be 16 digits");
        return false;
      }
      if (!cardExpiry || !cardExpiry.match(/^\d{2}\/\d{2}$/)) {
        showError("Expiry must be in MM/YY format");
        return false;
      }
      if (!cardCVV || cardCVV.length !== 3) {
        showError("CVV must be 3 digits");
        return false;
      }
      if (!cardName) {
        showError("Please enter cardholder name");
        return false;
      }
      break;

    case "netbanking":
      const bank = document.getElementById("bankSelect").value;
      if (!bank) {
        showError("Please select a bank");
        return false;
      }
      break;
  }

  return true;
}

// Process payment (MODIFIED FOR SHOWCASE SIMULATION)
async function processPayment() {
  if (cart.length === 0) {
    showError("Your cart is empty.");
    return;
  }

  if (!validatePaymentDetails()) {
    return;
  }

  const paymentBtn = document.getElementById("paymentBtn");

  paymentBtn.disabled = true;
  paymentBtn.innerText = "Processing...";

  // SHOW PROCESSING MODAL
  document.getElementById("processingModal").style.display = "flex";

  try {
    const method = document.querySelector(
      'input[name="paymentMethod"]:checked',
    ).value;

    const totalAmount = parseFloat(
      document.getElementById("totalAmount").textContent.replace("₹", ""),
    );

    // SIMULATE PAYMENT GATEWAY DELAY
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // GENERATE ORDER ID
    const orderId = generateOrderId();

    // PREPARE ORDER
    const orderData = {
      orderId,
      items: cart,
      totalAmount,
      paymentMethod: method,
      orderType: selectedOrderType,
      tableNumber: selectedOrderType === "dine-in" ? selectedTable : null,

      status: "preparing",
      timestamp: new Date().toISOString(),
    };

    // SAVE TO BACKEND
    const token = localStorage.getItem("token");

    await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    // CLEAR CART
    cart = [];
    localStorage.removeItem(cartStorageKey());

    // HIDE PROCESSING
    document.getElementById("processingModal").style.display = "none";

    // SHOW SUCCESS
    showSuccessModal(orderId, totalAmount, method);
  } catch (err) {
    console.error(err);

    document.getElementById("processingModal").style.display = "none";

    showError("Payment Failed.");
  } finally {
    paymentBtn.disabled = false;
    paymentBtn.innerText = "Pay Now";
  }
}

// Get payment details based on method
function getPaymentDetails(method) {
  switch (method) {
    case "upi":
      return {
        upiId: document.getElementById("upiId").value,
      };
    case "card":
      return {
        cardNumber:
          "**** **** **** " +
          document.getElementById("cardNumber").value.slice(-4),
        cardName: document.getElementById("cardName").value,
      };
    case "netbanking":
      return {
        bank: document.getElementById("bankSelect").options[
          document.getElementById("bankSelect").selectedIndex
        ].text,
      };
    case "qr":
      return {
        reference: document.getElementById("qrReference").value || "N/A",
      };
    case "cod":
      return {
        method: "Cash on Delivery",
      };
    default:
      return {};
  }
}

// Generate order ID
function generateOrderId() {
  return "#ORD-" + Date.now();
}

// Show success modal
function showSuccessModal(orderId, totalAmount, method) {
  currentOrderId = orderId; // Save the order ID for tracking
  document.getElementById("orderId").textContent = orderId;
  document.getElementById("modalTotal").textContent =
    `₹${totalAmount.toFixed(2)}`;
  document.getElementById("modalPaymentMethod").textContent =
    capitalizeMethod(method);
  document.getElementById("successModal").style.display = "block";
}

// Show pending modal (for COD)
function showPendingModal(orderId, totalAmount, method) {
  currentOrderId = orderId; // Save the order ID for tracking
  document.getElementById("pendingOrderId").textContent = orderId;
  document.getElementById("pendingTotal").textContent =
    `₹${totalAmount.toFixed(2)}`;
  document.getElementById("pendingModal").style.display = "block";
}

// Capitalize payment method name
function capitalizeMethod(method) {
  const names = {
    upi: "UPI",
    card: "Debit/Credit Card",
    netbanking: "Net Banking",
    qr: "QR Code",
    cod: "Cash on Delivery",
  };
  return names[method] || method;
}

// Add items from payment page (if navigating back)
function addItemToCart(item) {
  const existingItem = cart.find((i) => i.id === item.id);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart();
  displayCart();
  updateBillingTotal();
}

// Track order function
function trackOrder() {
  if (currentOrderId) {
    window.location.href = `/order-tracking.html?id=${currentOrderId}`;
  }
}

// Allow clicking on modals to close them
document.addEventListener("click", function (event) {
  const successModal = document.getElementById("successModal");
  const pendingModal = document.getElementById("pendingModal");

  if (event.target === successModal) {
    successModal.style.display = "none";
  }
  if (event.target === pendingModal) {
    pendingModal.style.display = "none";
  }
});

// Keyboard close for modals
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    document.getElementById("successModal").style.display = "none";
    document.getElementById("pendingModal").style.display = "none";
  }
});
function selectOrderType(type) {
  selectedOrderType = type;

  document
    .querySelectorAll(".order-type-btn")
    .forEach((btn) => btn.classList.remove("active"));

  if (type === "dine-in") {
    document.getElementById("dineInBtn").classList.add("active");
  } else {
    document.getElementById("deliveryBtn").classList.add("active");
  }
}

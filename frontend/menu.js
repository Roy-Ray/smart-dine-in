let allItems = [];
let cart = [];

// Load cart from localStorage
function loadCartFromStorage() {
  const saved = localStorage.getItem("dineInCart");
  if (saved) {
    cart = JSON.parse(saved);
    updateCartBadge();
  }
}

// Save cart to localStorage
function saveCartToStorage() {
  localStorage.setItem("dineInCart", JSON.stringify(cart));
  updateCartBadge();
}

// Update cart badge count
function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (badge) {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-block" : "none";
  }
}

async function loadMenu() {
  const res = await fetch("/api/menu");
  allItems = await res.json();
  displayItems(allItems);
}

function displayItems(items) {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "";

  items.forEach((item) => {
    container.innerHTML += `
      <div class="menu-item">
        <img src="${item.image}" alt="${item.name}" style="width:100%; height:200px; object-fit:cover; border-radius:12px; margin-bottom:0.8rem;" />
        <h3>${item.name}</h3>
        <p style="color:#666; font-size:0.9rem;">${item.description || ""}</p>
        <p style="font-weight:bold; color:#9b6dff; margin:10px 0;">₹${item.price}</p>
        <div style="display: flex; gap: 0.5rem;">
          <button onclick="addToCart(${item.id}, '${item.name}', ${item.price})" class="btn" style="width:100%; background: #fff; border: 2px solid #9b6dff; color: #9b6dff;">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
          <button onclick="buyNow(${item.id}, ${item.price})" class="btn" style="width:100%;">
            <i class="fas fa-bolt"></i> Buy Now
          </button>
        </div>
      </div>
    `;
  });
}

// Add item to cart
function addToCart(itemId, itemName, itemPrice) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    window.location.href = "/login.html";
    return;
  }

  const existingItem = cart.find((i) => i.id === itemId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    const item = allItems.find((i) => i.id === itemId);
    cart.push({
      id: itemId,
      name: itemName,
      price: itemPrice,
      quantity: 1,
      image: item?.image || "",
    });
  }

  saveCartToStorage();
  showAddedNotification(itemName);
}

// Show notification
function showAddedNotification(itemName) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999;
    animation: slideIn 0.3s ease-out;
  `;
  notification.innerHTML = `<i class="fas fa-check"></i> ${itemName} added to cart!`;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Buy now (direct checkout)
function buyNow(itemId, itemPrice) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in to place an order.");
    window.location.href = "/login.html";
    return;
  }

  // Store selected item in session to use on the payment page
  sessionStorage.setItem("checkoutItem", JSON.stringify({ itemId, itemPrice }));
  window.location.href = "/payment.html";
}

// Go to cart
function goToCart() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Please log in first.");
    window.location.href = "/login.html";
    return;
  }
  window.location.href = "/payment.html";
}

// SEARCH
document.getElementById("searchBar")?.addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();
  const filtered = allItems.filter((i) => i.name.toLowerCase().includes(value));
  displayItems(filtered);
});

// SORT
document.getElementById("sortPrice")?.addEventListener("change", (e) => {
  let sorted = [...allItems];

  if (e.target.value === "low") sorted.sort((a, b) => a.price - b.price);
  if (e.target.value === "high") sorted.sort((a, b) => b.price - a.price);

  displayItems(sorted);
});

// FILTER
document.getElementById("categoryFilter")?.addEventListener("change", (e) => {
  const value = e.target.value;
  const filtered = value
    ? allItems.filter((i) => i.category === value)
    : allItems;

  displayItems(filtered);
});

// Initialize
loadCartFromStorage();
loadMenu();


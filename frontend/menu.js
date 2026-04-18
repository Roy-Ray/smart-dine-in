let allItems = [];

async function loadMenu() {
  const res = await fetch("/api/menu");
  allItems = await res.json();
  displayItems(allItems);
}

function displayItems(items) {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "";

  // Notice the button here now calls proceedToPayment instead of orderNow
  items.slice(0, 5).forEach((item) => {
    container.innerHTML += `
      <div class="menu-item">
        <h3>${item.name}</h3>
        <p>${item.description || ''}</p>
        <p>₹${item.price}</p>
        <button onclick="proceedToPayment(${item.id}, ${item.price})" class="btn">Order Now</button>
      </div>
    `;
  });
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

// PROCEED TO PAYMENT (Checks Auth First)
function proceedToPayment(itemId, itemPrice) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    alert("Please log in to place an order.");
    window.location.href = "/login.html"; // Redirect to login
    return;
  }

  // Store selected item in session to use on the payment page
  sessionStorage.setItem("checkoutItem", JSON.stringify({ itemId, itemPrice }));
  window.location.href = "/payment.html"; // Redirect to payment gateway
}

loadMenu();
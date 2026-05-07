let allItems = [];

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
        <button onclick="proceedToPayment(${item.id}, ${item.price})" class="btn" style="width:100%;">Order Now</button>
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

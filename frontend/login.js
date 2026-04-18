function toggleAuth() {
  const loginBox = document.getElementById("loginBox");
  const registerBox = document.getElementById("registerBox");
  if (loginBox.style.display === "none") {
    loginBox.style.display = "block";
    registerBox.style.display = "none";
  } else {
    loginBox.style.display = "none";
    registerBox.style.display = "block";
  }
}

// Handle Login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    // Save token to local storage
    localStorage.setItem("token", data.token);
    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userName", data.name);
    
    alert("Login Successful!");
    
    // Redirect based on role
    if (data.role === "admin") {
      window.location.href = "/admin.html";
    } else {
      window.location.href = "/menu.html";
    }
  } else {
    alert(data.error);
  }
});

// Handle Register
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password })
  });

  const data = await res.json();
  alert(data.message || data.error);
  if (res.ok) toggleAuth(); // Switch to login screen
});
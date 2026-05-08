// admin-login.js

async function handleAdminLogin(event) {
  event.preventDefault();

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;
  const role = document.getElementById("adminRole").value;
  const errorMsg = document.getElementById("errorMsg");
  const loading = document.getElementById("loading");
  const loginBtn = document.getElementById("loginBtn");

  // Clear error
  errorMsg.classList.remove("show");

  if (!role) {
    errorMsg.textContent = "Please select a role";
    errorMsg.classList.add("show");
    return;
  }

  loading.classList.add("show");
  loginBtn.disabled = true;

  try {
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    // Save admin token and role
    localStorage.setItem("adminToken", data.token);
    localStorage.setItem("adminRole", data.role);
    localStorage.setItem("adminName", data.name);

    // Redirect to admin dashboard
    window.location.href = "/admin-dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    errorMsg.textContent = error.message;
    errorMsg.classList.add("show");
  } finally {
    loading.classList.remove("show");
    loginBtn.disabled = false;
  }
}

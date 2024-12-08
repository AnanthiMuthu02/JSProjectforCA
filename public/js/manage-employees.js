document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in and redirect to login if not
    const userId = localStorage.getItem("userId");
    const role = localStorage.getItem("role");
  
    if (!userId || role !== "admin") {
      alert("Access denied. Redirecting to login.");
      window.location.href = "login.html";
    }
  
    // Add a new employee
    const form = document.getElementById("add-employee-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const name = document.getElementById("employee-name").value;
      const email = document.getElementById("employee-email").value;
      const password = document.getElementById("employee-password").value;
      const role = document.getElementById("employee-role").value;
  
      try {
        const response = await fetch("/employees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "user-id": userId, // Include userId in headers
          },
          body: JSON.stringify({ name, email, password, role }),
        });
  
        if (response.ok) {
          alert("Employee added successfully!");
          form.reset();
          fetchEmployees(); // Refresh the employee list
        } else {
          console.error("Failed to add employee:", response.statusText);
        }
      } catch (error) {
        console.error("Error adding employee:", error);
      }
    });
  
    // Fetch and populate employee list
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/employees", {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId, // Include userId in headers
          },
        });
  
        if (response.ok) {
          const employees = await response.json();
          const employeeList = document.getElementById("employee-list");
          employeeList.innerHTML = employees
            .map(
              (employee) =>
                `<li>${employee.name} (${employee.email})</li>`
            )
            .join("");
        } else {
          console.error("Failed to fetch employees:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
  
    // Initialize employee list on page load
    fetchEmployees();
  });
  
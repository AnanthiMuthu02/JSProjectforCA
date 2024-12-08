document.addEventListener("DOMContentLoaded", () => {
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  if (!userId || role !== "admin") {
    alert("Access denied. Redirecting to login.");
    window.location.href = "login.html";
  }

  const form = document.getElementById("add-employee-form");
  const employeeTable = document.getElementById("employee-table-body");
  const searchInput = document.getElementById("search-employee");

  let allEmployees = []; // Store all employees locally for filtering

  // Add a new employee
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
          "user-id": userId,
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (response.ok) {
        alert("Employee added successfully!");
        form.reset();
        fetchEmployees();
      } else {
        console.error("Failed to add employee:", response.statusText);
      }
    } catch (error) {
      console.error("Error adding employee:", error);
    }
  });

  // Fetch all employees and populate the table
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/employees-with-projects", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
      });

      if (response.ok) {
        allEmployees = await response.json(); // Save employees for filtering
        renderEmployeeTable(allEmployees); // Render the table
      } else {
        console.error("Failed to fetch employees:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Render employees in the table
  const renderEmployeeTable = (employees) => {
    employeeTable.innerHTML = employees
      .map(
        (employee) => `
      <tr>
        <td>${employee.name}</td>
        <td>${employee.email}</td>
        <td>${employee.role}</td>
        <td>${employee.projects.join(", ") || "None"}</td>
        <td><button class="delete-btn" data-id="${employee.id}">Delete</button></td>
      </tr>
    `
      )
      .join("");

    // Add delete event listeners
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const employeeId = e.target.getAttribute("data-id");
        if (confirm("Are you sure you want to delete this employee?")) {
          try {
            const response = await fetch(`/employees/${employeeId}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "user-id": userId,
              },
            });

            if (response.ok) {
              alert("Employee deleted successfully!");
              fetchEmployees();
            } else {
              console.error("Failed to delete employee:", response.statusText);
            }
          } catch (error) {
            console.error("Error deleting employee:", error);
          }
        }
      });
    });
  };

  // Filter functionality
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim().toLowerCase();

    const filteredEmployees = allEmployees.filter((employee) => {
      const employeeName = employee.name.toLowerCase();
      const employeeEmail = employee.email.toLowerCase();
      const assignedProjects = employee.projects.join(", ").toLowerCase();

      return (
        employeeName.includes(query) ||
        employeeEmail.includes(query) ||
        assignedProjects.includes(query)
      );
    });

    renderEmployeeTable(filteredEmployees); // Render filtered results
  });

  // Initialize employee list on page load
  fetchEmployees();
});

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in and redirect to login if not
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  if (!userId || role !== "admin") {
    alert("Access denied. Redirecting to login.");
    window.location.href = "login.html";
  }

  // Fetch and update dashboard stats
  const fetchStats = async () => {
    try {
      const response = await fetch("/dashboard", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        document.getElementById("total-employees").textContent = stats.employees;
        document.getElementById("total-projects").textContent = stats.projects;
        document.getElementById("active-projects").textContent = stats.activeProjects;
        document.getElementById("completed-projects").textContent = stats.completedProjects;
      } else {
        console.error("Failed to fetch stats:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch and display all projects
  const fetchProjects = async () => {
    try {
      const response = await fetch("/projects", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
      });

      if (response.ok) {
        const projects = await response.json();
        const projectTableBody = document.getElementById("all-projects");
        projectTableBody.innerHTML = projects
          .map(
            (project) => `
            <tr>
              <td>${project.id}</td>
              <td>${project.title}</td>
              <td>${project.status || "N/A"}</td>
              <td>${project.budget || "N/A"}</td>
            </tr>
          `
          )
          .join("");
      } else {
        console.error("Failed to fetch projects:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Fetch and display all employees with their assigned projects
  const fetchEmployees = async () => {
    try {
      const response = await fetch("/employees-with-projects", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
      });

      if (response.ok) {
        const employees = await response.json();
        const employeeTableBody = document.getElementById("employees-with-projects");
        employeeTableBody.innerHTML = employees
          .map(
            (employee) => `
            <tr>
              <td>${employee.id}</td>
              <td>${employee.name}</td>
              <td>${employee.email}</td>
              <td>${employee.projects.length > 0 ? employee.projects.join(", ") : "Not assigned to any project"}</td>
            </tr>
          `
          )
          .join("");
      } else {
        console.error("Failed to fetch employees:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Initialize data on page load
  fetchStats();
  fetchProjects();
  fetchEmployees();
});

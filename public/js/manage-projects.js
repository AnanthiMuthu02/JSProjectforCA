document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in and redirect to login if not
    const userId = localStorage.getItem("userId");
    const role = localStorage.getItem("role");
  
    if (!userId || role !== "admin") {
      alert("Access denied. Redirecting to login.");
      window.location.href = "login.html";
    }
  
    // Add a new project
    const form = document.getElementById("add-project-form");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const title = document.getElementById("project-title").value;
      const description = document.getElementById("project-description").value;
      const budget = document.getElementById("project-budget").value;
      const startDate = document.getElementById("start-date").value;
      const endDate = document.getElementById("end-date").value;
  
      try {
        const response = await fetch("/projects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "user-id": userId, // Include userId in headers
          },
          body: JSON.stringify({
            title,
            description,
            budget,
            start_date: startDate,
            end_date: endDate,
          }),
        });
  
        if (response.ok) {
          alert("Project added successfully!");
          form.reset();
          fetchProjects(); // Refresh the project list
        } else {
          console.error("Failed to add project:", response.statusText);
        }
      } catch (error) {
        console.error("Error adding project:", error);
      }
    });
  
    // Fetch and populate project list
    const fetchProjects = async () => {
      try {
        const response = await fetch("/projects", {
          headers: {
            "Content-Type": "application/json",
            "user-id": userId, // Include userId in headers
          },
        });
  
        if (response.ok) {
          const projects = await response.json();
          const projectList = document.getElementById("project-list");
          const projectDropdown = document.getElementById("assign-project");
          projectList.innerHTML = projects
            .map(
              (project) =>
                `<li>${project.title} (Budget: ${project.budget})</li>`
            )
            .join("");
  
          // Populate the project dropdown for assignment
          projectDropdown.innerHTML = `<option value="">Select Project</option>`;
          projects.forEach((project) => {
            const option = document.createElement("option");
            option.value = project.id;
            option.textContent = project.title;
            projectDropdown.appendChild(option);
          });
        } else {
          console.error("Failed to fetch projects:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    };
  
    // Fetch and populate employee list for assignment
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
          const employeeDropdown = document.getElementById("assign-employee");
  
          // Populate the employee dropdown for assignment
          employeeDropdown.innerHTML = `<option value="">Select Employee</option>`;
          employees.forEach((employee) => {
            const option = document.createElement("option");
            option.value = employee.id;
            option.textContent = `${employee.name} (${employee.email})`;
            employeeDropdown.appendChild(option);
          });
        } else {
          console.error("Failed to fetch employees:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
  
    // Assign a project to an employee
    const assignForm = document.getElementById("assign-project-form");
    assignForm.addEventListener("submit", async (e) => {
      e.preventDefault();
  
      const employeeId = document.getElementById("assign-employee").value;
      const projectId = document.getElementById("assign-project").value;
  
      if (!employeeId || !projectId) {
        alert("Please select both an employee and a project.");
        return;
      }
  
      try {
        const response = await fetch("/assign-project", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "user-id": userId, // Include userId in headers
          },
          body: JSON.stringify({ employee_id: employeeId, project_id: projectId }),
        });
  
        if (response.ok) {
          alert("Project assigned successfully!");
          assignForm.reset();
        } else {
          console.error("Failed to assign project:", response.statusText);
        }
      } catch (error) {
        console.error("Error assigning project:", error);
      }
    });
  
    // Initialize project and employee lists on page load
    fetchProjects();
    fetchEmployees();
  });
  
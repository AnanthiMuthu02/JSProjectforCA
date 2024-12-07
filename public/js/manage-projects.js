document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in and redirect to login if not
  const userId = localStorage.getItem("userId");
  const role = localStorage.getItem("role");

  if (!userId || role !== "admin") {
    alert("Access denied. Redirecting to login.");
    window.location.href = "login.html";
  }

  // Fetch skills to populate the skills dropdown
  const fetchSkills = async () => {
    try {
      const response = await fetch("/skills", {
        headers: {
          "Content-Type": "application/json",
          "user-id": userId, // Include userId in headers
        },
      });

      if (response.ok) {
        const skills = await response.json();
        const skillDropdown = document.getElementById("project-skills");
        skillDropdown.innerHTML = skills
          .map(
            (skill) =>
              `<option value="${skill.id}">${skill.name}</option>`
          )
          .join("");
      } else {
        console.error("Failed to fetch skills:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  // Add a new project
  const form = document.getElementById("add-project-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("project-title").value;
    const description = document.getElementById("project-description").value;
    const budget = document.getElementById("project-budget").value;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;

    // Collect selected skills
    const selectedSkills = Array.from(
      document.getElementById("project-skills").selectedOptions
    ).map((option) => option.value);

    if (selectedSkills.length === 0) {
      alert("Please select at least one skill for the project.");
      return;
    }

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
          skills: selectedSkills,
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

  // Mark a project as completed
  const markAsCompleted = async (projectId) => {
    try {
      const response = await fetch(`/projects/${projectId}/complete`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("Project marked as completed.");
        fetchProjects(); // Refresh the project list
      } else {
        console.error("Failed to mark project as completed:", response.statusText);
      }
    } catch (error) {
      console.error("Error marking project as completed:", error);
    }
  };

  // Make the function accessible globally
  window.markAsCompleted = markAsCompleted;

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
              `<li>
        ${project.title} (Budget: ${project.budget}, Status: ${project.status})
        <button onclick="markAsCompleted('${project.id}')">Mark as Completed</button>
        <button onclick="deleteProject('${project.id}')">Delete</button>
      </li>`
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

  // Delete project
  const deleteProject = async (projectId) => {
    if (!projectId) {
      console.error("Project ID is undefined.");
      return;
    }

    if (!confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      const response = await fetch(`/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId, // Include userId in headers
        },
      });

      if (response.ok) {
        alert("Project deleted successfully!");
        fetchProjects(); // Refresh the project list
      } else {
        console.error("Failed to delete project:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  // Make the function accessible globally
  window.deleteProject = deleteProject;

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

  // Modal handling
  const modals = document.querySelectorAll(".modal");
  const addProjectBtn = document.getElementById("add-project-btn");
  const assignProjectBtn = document.getElementById("assign-project-btn");

  addProjectBtn.addEventListener("click", () => {
    document.getElementById("add-project-modal").style.display = "block";
  });

  assignProjectBtn.addEventListener("click", () => {
    document.getElementById("assign-project-modal").style.display = "block";
  });

  modals.forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        modal.style.display = "none";
      }
    });

    modal.querySelector(".close").addEventListener("click", () => {
      modal.style.display = "none";
    });
  });

  // Initialize project, employee, and skills lists on page load
  fetchProjects();
  fetchEmployees();
  fetchSkills();
});

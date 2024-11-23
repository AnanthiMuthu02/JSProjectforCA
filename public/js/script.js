document.getElementById("add-employee-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("employee-name").value;
    const email = document.getElementById("employee-email").value;
    const password = document.getElementById("employee-password").value;
    const role = document.getElementById("employee-role").value;
  
    const response = await fetch("/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json", userRole: "admin" },
      body: JSON.stringify({ name, email, password, role }),
    });
  
    if (response.ok) {
      alert("Employee added successfully!");
      fetchEmployees();
    } else {
      alert("Error adding employee.");
    }
  });
  
  async function fetchEmployees() {
    const response = await fetch("/dashboard", {
      headers: { userRole: "admin" },
    });
    const { employees } = await response.json();
    const employeeList = document.getElementById("employee-list");
    employeeList.innerHTML = "";
    employees.forEach((employee) => {
      const li = document.createElement("li");
      li.textContent = `${employee.name} - ${employee.role}`;
      employeeList.appendChild(li);
    });
  }
  
  document.getElementById("add-project-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("project-title").value;
    const description = document.getElementById("project-description").value;
    const budget = document.getElementById("project-budget").value;
    const startDate = document.getElementById("start-date").value;
    const endDate = document.getElementById("end-date").value;
  
    const response = await fetch("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", userRole: "admin" },
      body: JSON.stringify({ title, description, budget, start_date: startDate, end_date: endDate }),
    });
  
    if (response.ok) {
      alert("Project added successfully!");
      fetchProjects();
    } else {
      alert("Error adding project.");
    }
  });
  
  fetchEmployees();
  fetchProjects();
  
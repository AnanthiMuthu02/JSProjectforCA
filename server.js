const express = require("express");
const sqlite3 = require("sqlite3").verbose(); // Import sqlite3
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const dbPath = path.resolve(__dirname, "database/db.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session Management
const sessions = {}; // In-memory sessions: { userId: { role: 'admin' or 'employee' } }

// Middleware for role-based access
const verifyRole = (role) => (req, res, next) => {
  console.log("Request headers:", req.headers); // Debug log headers
  const userId = req.headers["user-id"]; // Retrieve userId from headers
  console.log("User ID in headers:", userId); // Debug log userId
  console.log("Sessions object:", sessions); // Debug log sessions

  if (!userId || !sessions[userId] || sessions[userId].role !== role) {
    console.error("Access denied: Role mismatch or user not logged in");
    return res.status(403).send("Access denied");
  }
  console.log("Access granted to role:", sessions[userId].role);
  next();
};



// Routes

// Sign-Up Route
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      console.error("Validation failed: Missing fields.");
      return res.status(400).send("All fields are required.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, role],
      function (err) {
        if (err) {
          console.error("Database error:", err.message); // Log detailed error
          if (err.message.includes("UNIQUE constraint failed")) {
            return res.status(400).send("Email already exists.");
          }
          return res.status(500).send("Database error.");
        }
        res.status(201).send("User created successfully.");
      }
    );
  } catch (error) {
    console.error("Signup error:", error.message); // Log unexpected errors
    res.status(500).send("Server error.");
  }
});

// Login Route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Database error");
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.error("Invalid credentials");
      return res.status(401).send("Invalid credentials");
    }

    sessions[user.id] = { role: user.role }; // Save session
    console.log("Session created:", sessions[user.id]); // Debug log
    res.json({ userId: user.id, role: user.role });
  });
});


// Logout Route (optional)
app.post("/logout", (req, res) => {
  const userId = req.headers["user-id"];
  if (userId) {
    delete sessions[userId];
  }
  res.send("Logged out successfully.");
});

// Admin Routes
app.get("/dashboard", verifyRole("admin"), (req, res) => {
  const queries = {
    employees: "SELECT COUNT(*) as total FROM users WHERE role = 'employee'",
    projects: "SELECT COUNT(*) as total FROM projects",
    activeProjects: "SELECT COUNT(*) as total FROM projects WHERE status = 'active'",
    completedProjects: "SELECT COUNT(*) as total FROM projects WHERE status = 'completed'",
  };

  const results = {};
  let completed = 0;

  for (const key in queries) {
    db.get(queries[key], (err, row) => {
      if (err) return res.status(500).send("Database error");
      results[key] = row.total;
      completed++;
      if (completed === Object.keys(queries).length) res.json(results);
    });
  }
});

app.post("/projects", verifyRole("admin"), (req, res) => {
  const { title, description, budget, start_date, end_date } = req.body;
  db.run(
    "INSERT INTO projects (title, description, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
    [title, description, budget, start_date, end_date],
    function (err) {
      if (err) return res.status(500).send("Database error");
      res.json({ projectId: this.lastID });
    }
  );
});

app.post("/employees", verifyRole("admin"), (req, res) => {
  const { name, email, role, department, password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    [name, email, hashedPassword, role],
    function (err) {
      if (err) return res.status(500).send("Database error");
      res.json({ employeeId: this.lastID });
    }
  );
});

// Assign project to employee
app.post("/assign-project", verifyRole("admin"), (req, res) => {
  const { employee_id, project_id } = req.body;

  if (!employee_id || !project_id) {
    return res.status(400).send("Employee ID and Project ID are required.");
  }

  db.run(
    "INSERT INTO project_assignments (employee_id, project_id) VALUES (?, ?)",
    [employee_id, project_id],
    function (err) {
      if (err) {
        console.error("Database error:", err.message);
        return res.status(500).send("Failed to assign project.");
      }
      res.status(201).send("Project assigned successfully.");
    }
  );
});
// Fetch all employees
app.get("/employees", verifyRole("admin"), (req, res) => {
  db.all("SELECT id, name, email FROM users WHERE role = 'employee'", (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Failed to fetch employees.");
    }
    res.json(rows);
  });
});

// Employee Routes
app.get("/my-projects/:id", verifyRole("employee"), (req, res) => {
  const employeeId = req.params.id;

  db.all(
    `SELECT projects.* FROM projects
     JOIN project_assignments ON projects.id = project_assignments.project_id
     WHERE project_assignments.employee_id = ?`,
    [employeeId],
    (err, rows) => {
      if (err) return res.status(500).send("Database error");
      res.json(rows);
    }
  );
});

app.post("/update-profile/:id", verifyRole("employee"), (req, res) => {
  const employeeId = req.params.id;
  const { name, email, skills } = req.body;

  db.run(
    "UPDATE users SET name = ?, email = ? WHERE id = ?",
    [name, email, employeeId],
    (err) => {
      if (err) return res.status(500).send("Database error");
      res.send("Profile updated successfully");
    }
  );
});
// Fetch all projects
app.get("/projects", verifyRole("admin"), (req, res) => {
  db.all("SELECT id, title FROM projects", (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Failed to fetch projects.");
    }
    res.json(rows);
  });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

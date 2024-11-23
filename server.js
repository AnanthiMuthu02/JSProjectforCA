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


const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Middleware for role-based access
const verifyRole = (role) => (req, res, next) => {
  const { userRole } = req.headers;
  if (userRole !== role) return res.status(403).send("Access denied");
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

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).send("Database error");
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).send("Invalid credentials");
    res.json({ userId: user.id, role: user.role });
  });
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

app.post("/assign-project", verifyRole("admin"), (req, res) => {
  const { employee_id, project_id } = req.body;

  db.run(
    "INSERT INTO project_assignments (employee_id, project_id) VALUES (?, ?)",
    [employee_id, project_id],
    function (err) {
      if (err) return res.status(500).send("Database error");
      res.json({ assignmentId: this.lastID });
    }
  );
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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

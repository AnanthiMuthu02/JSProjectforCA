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
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html')); // assuming your home page is index.html in the 'public' folder
});
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
    const { name, email, password, role, skills } = req.body;

    // Validation: Check if all required fields are present, including at least one skill
    if (!name || !email || !password || !role || (role === 'employee' && (!skills || skills.length === 0))) {
      console.error("Validation failed: Missing fields or no skills selected.");
      return res.status(400).send("All fields are required, including at least one skill.");
    }

    // Hash the password
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

        // Get the user ID of the newly created user
        const userId = this.lastID;

        // Insert skills into the user_skills table
        if (skills && skills.length > 0) {
          const placeholders = skills.map(() => "(?, ?)").join(",");
          const flatValues = skills.flatMap(skillId => [userId, skillId]);

          db.run(
            `INSERT INTO user_skills (user_id, skill_id) VALUES ${placeholders}`,
            flatValues,
            (err) => {
              if (err) {
                console.error("Error inserting skills:", err.message);
                return res.status(500).send("Error assigning skills to user.");
              }

              res.status(201).send("User created successfully.");
            }
          );
        } else {
          res.status(201).send("User created successfully.");
        }
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
  const { title, description, budget, start_date, end_date, skills } = req.body;

  if (!skills || !Array.isArray(skills) || skills.length === 0) {
    return res.status(400).send("Skills are required for the project.");
  }

  db.serialize(() => {
    // Insert the project into the database
    db.run(
      "INSERT INTO projects (title, description, budget, start_date, end_date) VALUES (?, ?, ?, ?, ?)",
      [title, description, budget, start_date, end_date],
      function (err) {
        if (err) {
          return res.status(500).send("Database error while adding project.");
        }

        const projectId = this.lastID;

        // Insert the project skills into the project_skills table
        const skillInsertQuery = `INSERT INTO project_skills (project_id, skill_id) VALUES (?, ?)`;
        const stmt = db.prepare(skillInsertQuery);

        skills.forEach((skillId) => {
          stmt.run([projectId, skillId], (err) => {
            if (err) {
              console.error("Error inserting project skill:", err.message);
            }
          });
        });

        stmt.finalize();
        res.json({ projectId, message: "Project created successfully with skills." });
      }
    );
  });
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
// Endpoint to get all employees with their skills
app.get("/employees", (req, res) => {
  db.all("SELECT id, name, email FROM users WHERE role = 'employee'", (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Failed to fetch employees.");
    }
    res.json(rows);
  });
});




app.patch("/projects/:projectId/complete", (req, res) => {
  const { projectId } = req.params;

  const query = `
    UPDATE projects
    SET status = 'completed'
    WHERE id = ?
  `;

  db.run(query, [projectId], function (err) {
    if (err) {
      console.error("Error marking project as complete:", err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json({ message: "Project marked as complete." });
  });
});



// Employee Routes
// Fetch all projects assigned to a specific employee
app.get("/my-projects/:id", verifyRole("employee"), (req, res) => {
  const employeeId = req.params.id;

  const query = `
    SELECT projects.id, projects.title, projects.description, projects.status, projects.start_date, projects.end_date
    FROM projects
    INNER JOIN project_assignments
    ON projects.id = project_assignments.project_id
    WHERE project_assignments.employee_id = ?
  `;

  db.all(query, [employeeId], (err, rows) => {
    if (err) {
      console.error("Error fetching projects for employee:", err.message);
      return res.status(500).send("Failed to fetch projects.");
    }

    res.json(rows);
  });
});
app.delete("/projects/:projectId/employees/:employeeId", (req, res) => {
  const { projectId, employeeId } = req.params;

  // Step 1: Check if the project and employee assignment exists
  db.get(
    "SELECT * FROM project_assignments WHERE project_id = ? AND employee_id = ?",
    [projectId, employeeId],
    (err, row) => {
      if (err) {
        console.error("Error fetching assignment:", err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (!row) {
        // No assignment found
        return res.status(404).json({ message: "Employee not assigned to this project." });
      }

      // Step 2: Start the deletion process with data integrity in mind
      db.serialize(() => {
        // Step 2.1: Delete any associated project skills if necessary
        db.run(
          "DELETE FROM project_skills WHERE project_id = ?",
          [projectId],
          function (err) {
            if (err) {
              console.error("Error removing project skills:", err);
              return res.status(500).json({ message: "Failed to remove associated skills" });
            }

            // Step 2.2: Delete the employee's assignment from the project
            db.run(
              "DELETE FROM project_assignments WHERE project_id = ? AND employee_id = ?",
              [projectId, employeeId],
              function (err) {
                if (err) {
                  console.error("Error removing employee from project:", err);
                  return res.status(500).json({ message: "Failed to remove employee from project" });
                }

                if (this.changes === 0) {
                  return res.status(404).json({ message: "Employee not assigned to this project." });
                }

                // Step 2.3: Log the activity of removing the employee
                db.run(
                  "INSERT INTO activity_logs (action) VALUES (?)",
                  [`Removed employee ${employeeId} from project ${projectId}`],
                  function (err) {
                    if (err) {
                      console.error("Error logging activity:", err);
                    }
                  }
                );

                // Return success response
                res.json({ message: "Employee successfully removed from project." });
              }
            );
          }
        );
      });
    }
  );
});

app.delete("/projects/:projectId", (req, res) => {
  const { projectId } = req.params;

  // Check if the project exists
  db.get(
    "SELECT * FROM projects WHERE id = ?",
    [projectId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }

      if (!row) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Start a transaction to maintain data integrity
      db.serialize(() => {
        // Delete project assignments for this project
        db.run(
          "DELETE FROM project_assignments WHERE project_id = ?",
          [projectId],
          function (err) {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Failed to delete project assignments" });
            }

            // Delete project skills related to this project
            db.run(
              "DELETE FROM project_skills WHERE project_id = ?",
              [projectId],
              function (err) {
                if (err) {
                  console.error(err);
                  return res.status(500).json({ error: "Failed to delete project skills" });
                }

                // Finally, delete the project itself
                db.run(
                  "DELETE FROM projects WHERE id = ?",
                  [projectId],
                  function (err) {
                    if (err) {
                      console.error(err);
                      return res.status(500).json({ error: "Failed to delete project" });
                    }

                    // Log the activity for the project deletion
                    db.run(
                      "INSERT INTO activity_logs (action) VALUES (?)",
                      [`Deleted project ${projectId}`]
                    );

                    return res.status(200).json({ message: "Project deleted successfully" });
                  }
                );
              }
            );
          }
        );
      });
    }
  );
});

app.put("/users/:id", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { name, email, password, skills } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  try {
    db.serialize(() => {
      // Update user's name and email
      const updateUserQuery = `UPDATE users SET name = ?, email = ? WHERE id = ?`;
      db.run(updateUserQuery, [name, email, userId], function (err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "Failed to update user profile." });
        }

        // If password is provided, hash and update it
        if (password) {
          const hashedPassword = bcrypt.hashSync(password, 10);
          const updatePasswordQuery = `UPDATE users SET password = ? WHERE id = ?`;
          db.run(updatePasswordQuery, [hashedPassword, userId], (err) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: "Failed to update password." });
            }
          });
        }

        // Update user's skills
        if (skills && Array.isArray(skills)) {
          // Delete existing skills for the user
          const deleteSkillsQuery = `DELETE FROM user_skills WHERE user_id = ?`;
          db.run(deleteSkillsQuery, [userId], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "Failed to update skills." });
            }

            // Insert new skills
            const insertSkillQuery = `INSERT INTO user_skills (user_id, skill_id) VALUES (?, ?)`;
            skills.forEach((skillId) => {
              db.run(insertSkillQuery, [userId, skillId], (err) => {
                if (err) {
                  console.error(err);
                }
              });
            });
          });
        }

        return res
          .status(200)
          .json({ message: "User profile updated successfully." });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
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
app.get('/employees-with-projects', verifyRole("admin"), (req, res) => {
  const query = `
    SELECT 
      u.id AS employee_id,
      u.name AS employee_name,
      u.email AS employee_email,
      u.role AS employee_role,   -- Include role in the query
      GROUP_CONCAT(p.title, ', ') AS assigned_projects
    FROM 
      users u
    LEFT JOIN 
      project_assignments pa ON u.id = pa.employee_id
    LEFT JOIN 
      projects p ON pa.project_id = p.id
    WHERE 
      u.role = 'employee'
    GROUP BY 
      u.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ error: 'Failed to fetch employees with projects' });
    } else {
      const employees = rows.map(row => ({
        id: row.employee_id,
        name: row.employee_name,
        email: row.employee_email,
        role: row.employee_role,  // Include role in the response
        projects: row.assigned_projects ? row.assigned_projects.split(', ') : []
      }));
      res.json(employees);
    }
  });
});


app.get('/projects_details',verifyRole("admin"), (req, res) => {
  db.all('SELECT id, title, status, budget FROM projects', [], (err, rows) => {
    if (err) {
      console.error('Error fetching projects:', err);
      return res.status(500).json({ message: 'Error fetching projects' });
    }
    res.json(rows);
  });
});
app.get("/skills", (req, res) => {
  db.all("SELECT id, name FROM skills", [], (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).json({ error: "Database error" });
    }
    // Send the list of skills in JSON format
    res.json(rows);
  });
});

app.delete("/employees/:id", verifyRole("admin"), (req, res) => {
  const employeeId = req.params.id;

  // Step 1: Check if the employee exists
  db.get("SELECT id FROM users WHERE id = ?", [employeeId], (err, row) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Database error.");
    }

    if (!row) {
      return res.status(404).send("Employee not found.");
    }

    // Step 2: Start the deletion process
    db.serialize(() => {
      // Step 2.1: Delete the employee's assignments from projects
      db.run(
        "DELETE FROM project_assignments WHERE employee_id = ?",
        [employeeId],
        function (err) {
          if (err) {
            console.error("Error removing employee from projects:", err.message);
            return res.status(500).send("Failed to remove employee from projects.");
          }

          // Step 2.2: Delete the employee's skills
          db.run(
            "DELETE FROM user_skills WHERE user_id = ?",
            [employeeId],
            function (err) {
              if (err) {
                console.error("Error removing employee skills:", err.message);
                return res.status(500).send("Failed to remove employee skills.");
              }

              // Step 2.3: Log the activity (optional for audit purposes)
              db.run(
                "INSERT INTO activity_logs (action) VALUES (?)",
                [`Deleted employee ${employeeId}`],
                function (err) {
                  if (err) {
                    console.error("Error logging activity:", err.message);
                  }
                }
              );

              // Step 2.4: Finally, delete the employee
              db.run(
                "DELETE FROM users WHERE id = ?",
                [employeeId],
                function (err) {
                  if (err) {
                    console.error("Error deleting employee:", err.message);
                    return res.status(500).send("Failed to delete employee.");
                  }

                  res.status(200).send("Employee deleted successfully.");
                }
              );
            }
          );
        }
      );
    });
  });
});

app.get("/projects/active", verifyRole("admin"), (req, res) => {
  // Query to select all active projects (assuming active projects have a status 'active')
  const sql = "SELECT * FROM projects WHERE status = 'active'";

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Database error:", err.message);
      return res.status(500).send("Failed to fetch active projects.");
    }

    // Return the active projects as a JSON response
    res.json(rows);
  });
});
module.exports = app
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:3000`));

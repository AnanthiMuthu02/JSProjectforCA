const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.resolve(__dirname, "db.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee'))
    )
  `);

  // Create projects table
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active'
    )
  `);

  // Create skills table
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  // Create user_skills table to link users and skills
  db.run(`
    CREATE TABLE IF NOT EXISTS user_skills (
      user_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, skill_id)
    )
  `);

  // Create project_skills table to link projects and skills
  db.run(`
    CREATE TABLE IF NOT EXISTS project_skills (
      project_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, skill_id)
    )
  `);

  // Create project_assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS project_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER,
      project_id INTEGER,
      FOREIGN KEY(employee_id) REFERENCES users(id),
      FOREIGN KEY(project_id) REFERENCES projects(id)
    )
  `);

  // Create activity_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default admin user if none exists
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.run(
    `INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', ?, 'admin')`,
    [hashedPassword]
  );

  // Insert default IT-related skills into the skills table
  db.run(`
    INSERT OR IGNORE INTO skills (name) VALUES 
    ('JavaScript'),
    ('Python'),
    ('Java'),
    ('C#'),
    ('SQL'),
    ('React'),
    ('Angular'),
    ('Docker'),
    ('Kubernetes'),
    ('AWS'),
    ('Linux Administration'),
    ('Data Analysis'),
    ('Machine Learning'),
    ('Cybersecurity');
  `);

  console.log("Database initialized with all necessary tables and default data.");
});

db.close();

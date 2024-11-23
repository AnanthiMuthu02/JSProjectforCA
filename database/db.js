const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const dbPath = path.resolve(__dirname, "db.sqlite");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'employee'))
      )
    `);
  
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
  
    db.run(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER,
        project_id INTEGER,
        FOREIGN KEY(employee_id) REFERENCES users(id),
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )
    `);
  
    db.run(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  
    // Create a default admin account if none exists
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.run(
      `INSERT OR IGNORE INTO users (name, email, password, role) VALUES ('Admin', 'admin@example.com', ?, 'admin')`,
      [hashedPassword]
    );
  });

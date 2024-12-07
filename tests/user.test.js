const request = require('supertest');
const app = require('../server'); // Assuming your server.js is in the parent directory

describe("User Management", () => {
  
  it("should sign up a new user", async () => {
    const response = await request(app)
      .post("/signup")
      .send({
        name: "John Doe",
        email: "johndoe1@example.com",
        password: "password123",
        role: "employee",
        skills: [1] // Assuming skill IDs exist in the system
      });
      
    expect(response.status).toBe(201);
    expect(response.text).toBe("User created successfully.");
  });
  
  it("should fail when email already exists", async () => {
    await request(app)
      .post("/signup")
      .send({
        name: "Jane Doe",
        email: "johndoe1@example.com",
        password: "password123",
        role: "employee",
        skills: [1]
      });
      
    const response = await request(app)
      .post("/signup")
      .send({
        name: "Jane Doe",
        email: "johndoe1@example.com",
        password: "password123",
        role: "employee",
        skills: [1]
      });

    expect(response.status).toBe(400);
    expect(response.text).toBe("Email already exists.");
  });

  it("should login the user", async () => {
    const response = await request(app)
      .post("/login")
      .send({
        email: "johndoe1@example.com",
        password: "password123"
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("userId");
    expect(response.body).toHaveProperty("role");
  });
  
  it("should fail login with wrong password", async () => {
    const response = await request(app)
      .post("/login")
      .send({
        email: "johndoe@example.com",
        password: "wrongpassword"
      });

    expect(response.status).toBe(401);
    expect(response.text).toBe("Invalid credentials");
  });
  
});

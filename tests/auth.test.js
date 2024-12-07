const request = require("supertest");
const app = require("../server");  // Assuming your Express app is in `server.js`

describe("Information System API", () => {
  
  it("should sign up a new user", async () => {
    const response = await request(app)
      .post("/signup")
      .send({
        name: "John Doe",
        email: "johndoe@example.com",
        password: "password123",
        role: "employee",
        skills: [1] // Assuming skill IDs exist in the system
      });
      
    expect(response.status).toBe(201);
    expect(response.text).toBe("User created successfully.");
  });
  

  it("should login a user on POST /login", async () => {
    const loginData = {
      email: "johndoe@example.com",
      password: "password123",
    };

    const response = await request(app)
      .post("/login")
      .send(loginData)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("userId");
    expect(response.body).toHaveProperty("role");
  });

  it("should return 403 for unauthorized access on /dashboard", async () => {
    const response = await request(app).get("/dashboard");
    expect(response.status).toBe(403);
    expect(response.text).toBe("Access denied");
  });

  it("should return a list of employees on GET /employees", async () => {
    const response = await request(app).get("/employees");
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it("should update a user's profile on PUT /users/:id", async () => {
    const updatedUser = {
      name: "John Updated",
      email: "johnupdated@example.com",
    };

    const response = await request(app)
      .put("/users/1")  // Use a valid user ID
      .send(updatedUser)
      .set("Accept", "application/json");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("User profile updated successfully.");
  });
});

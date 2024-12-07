const request = require("supertest");
const app = require("../server");

let adminSession, employeeSession;
let testEmployeeId;

describe("Delete Employee Endpoint", () => {
  // Step 1: Mock session data
  beforeAll(async () => {
    // Admin login
    const adminLoginResponse = await request(app)
      .post("/login")
      .send({
        email: "admin@gmail.com",
        password: "admin123",
      });

    expect(adminLoginResponse.status).toBe(200);
    // Simulate session data
    adminSession = {
      userId: adminLoginResponse.body.userId,
      role: adminLoginResponse.body.role,
    };

    // Regular employee login
    const employeeLoginResponse = await request(app)
      .post("/login")
      .send({
        email: "employee@gmail.com",
        password: "123",
      });

    expect(employeeLoginResponse.status).toBe(200);
    // Simulate session data
    employeeSession = {
      userId: employeeLoginResponse.body.userId,
      role: employeeLoginResponse.body.role,
    };
  });

  // Step 2: Create a new employee for testing
  it("should allow admin to create a test employee", async () => {
    const response = await request(app)
      .post("/signup")
      .send({
        name: "Test Employee",
        email: "testemployee@example.com",
        password: "password123",
        role: "employee",
        skills: [1, 2], // Assuming valid skill IDs exist
      });

    expect(response.status).toBe(201);
    expect(response.text).toBe("User created successfully.");

    // Fetch the test employee ID
    const employeesResponse = await request(app).get("/employees");

    const employee = employeesResponse.body.find(
      (e) => e.email === "testemployee@example.com"
    );
    expect(employee).toBeDefined();

    testEmployeeId = employee.id;
  });

  // Step 3: Test that admin can delete the employee
  it("should allow admin to delete the employee", async () => {
    // Simulate the admin session by passing user-id and role in the request headers
    const response = await request(app)
      .delete(`/employees/${testEmployeeId}`)
      .set("user-id", adminSession.userId); // Pass admin user ID in header
    expect(response.status).toBe(200);
    expect(response.text).toBe("Employee deleted successfully.");
  });

  // Step 4: Test that employee cannot delete another employee
  it("should not allow an employee to delete another employee", async () => {
    const response = await request(app)
      .delete(`/employees/${testEmployeeId}`)
      .set("user-id", employeeSession.userId); // Pass employee user ID in header
    expect(response.status).toBe(403);
    expect(response.text).toBe("Access denied");
  });

  // Step 5: Test that deleted employee does not exist
  it("should confirm that the deleted employee no longer exists", async () => {
    const response = await request(app)
      .get(`/employees/${testEmployeeId}`)
      .set("user-id", adminSession.userId); // Use admin session ID in header
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Employee not found.");
  });
});

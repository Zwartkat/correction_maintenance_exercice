import express from "express";
import { join } from "path";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import { hash, compare } from "bcrypt";
import rateLimit from "express-rate-limit";

const app = express();
app.use(express.json());

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || "mysql_db",
  user: process.env.DB_USER || "app_user",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "app_database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware to authenticate requests
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: "app-api",
      audience: "app-users",
    });
    // If token is valid, proceed to the next middleware/route handler
    next();
  } catch {
    res.status(401).json({ error: "Token invalid or expired" });
  }
}

// 1. Serve Static Assets (Frontend)
// 'front' is the folder where your index.html and scripts live
app.use(express.static("front"));

// 2. Your API Routes (Backend)

// --- Users CRUD ---
// Get users
app.get("/api/users", authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id,username FROM users");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login with user
app.post("/api/users/login", rateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    const [rows] = await pool.query("SELECT id,username FROM users WHERE username = ?", [
      username,
    ]);
    if (rows.length === 0 || !(await compare(password, rows[0].password)))
      return res.status(404).json({ message: "Invalid credentials" });
    // Generate JWT token
    const token = jwt.sign(
      { userId: rows[0].id, username: rows[0].username },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
        issuer: "app-api",
        audience: "app-users",
      },
    );
    res.json({ user: { id: rows[0].id, username: rows[0].username }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user if doesn't exist
app.post("/api/users/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 50 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 72
    ) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const [rows_check] = await pool.query(
      "SELECT id, username FROM users WHERE username = ?",
      [username],
    );
    if (rows_check.length > 0)
      return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
    );

    res.status(201).json({ user: { id: result.insertId, username } });
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

// Get user by id
app.get("/api/users/:id", authenticate, async (req, res) => {
  try {
    if (req.user.userId !== Number(req.params.id)) {
      return res.status(403).json({ error: "Forbidden" });
    }


    const [rows] = await pool.query("SELECT id,username FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Insert user
app.post("/api/users", authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    const [result] = await pool.query(
      "INSERT INTO users (username) VALUES (?, ?)",
      [username],
    );
    res.status(201).json({ id: result.insertId, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modify user
app.put("/api/users/:id", authenticate, async (req, res) => {
  try {
    const { username } = req.body;
    const [result] = await pool.query(
      "UPDATE users SET username = ? WHERE id = ?",
      [username, req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ id: req.params.id, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
app.delete("/api/users/:id", authenticate, async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Products CRUD ---
// Get products
app.get("/api/products", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, price FROM products");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by id
app.get("/api/products/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, price FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add product
app.post("/api/products", authenticate, async (req, res) => {
  try {
    const { name, price } = req.body;
    const [result] = await pool.query(
      "INSERT INTO products (name, price) VALUES (?, ?)",
      [name, price],
    );
    res.status(201).json({ id: result.insertId, name, price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Modify product
app.put("/api/products/:id", authenticate, async (req, res) => {
  try {
    const { name, price } = req.body;
    const [result] = await pool.query(
      "UPDATE products SET name = ?, price = ? WHERE id = ?",
      [name, price, req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json({ id: req.params.id, name, price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete("/api/products/:id", authenticate, async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));

import express from 'express';
import { join } from 'path';
import mysql from 'mysql2/promise';

const app = express();
app.use(express.json());

// Database connection
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'mysql_db',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'app_database',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 1. Serve Static Assets (Frontend)
// 'front' is the folder where your index.html and scripts live
app.use(express.static('front')); 

// 2. Your API Routes (Backend)

// --- Users CRUD ---
// Get users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login with user
app.post('/api/users/login', async (req, res) => {
    try {
        const { username } = req.body;
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
        res.json({ user: rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new user if doesn't exist
app.post('/api/users/register', async (req, res) => {
    try {
        const { username } = req.body;
        const [rows_check] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows_check.length > 0) return res.status(409).json({ message: 'User already exists' });

        // Generate a dummy email since it is required by the DB schema but not provided by the form
        const email = `${username}@example.com`;
        const [result] = await pool.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        
        res.status(201).json({ user: { id: result.insertId, username, email } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by id
app.get('/api/users/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Insert user with emails
app.post('/api/users', async (req, res) => {
    try {
        const { username, email } = req.body;
        const [result] = await pool.query('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        res.status(201).json({ id: result.insertId, username, email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Modify user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { username, email } = req.body;
        const [result] = await pool.query('UPDATE users SET username = ?, email = ? WHERE id = ?', [username, email, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ id: req.params.id, username, email });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Products CRUD ---
// Get products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get product by id
app.get('/api/products/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add product
app.post('/api/products', async (req, res) => {
    try {
        const { name, price } = req.body;
        const [result] = await pool.query('INSERT INTO products (name, price) VALUES (?, ?)', [name, price]);
        res.status(201).json({ id: result.insertId, name, price });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Modify product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { name, price } = req.body;
        const [result] = await pool.query('UPDATE products SET name = ?, price = ? WHERE id = ?', [name, price, req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ id: req.params.id, name, price });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
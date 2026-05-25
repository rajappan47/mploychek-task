"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_service_1 = require("./db.service");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Enable CORS for frontend requests
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
// 1. Delay Simulator Middleware
// Delays API response if '?delay=X' is specified in the query parameters
const delayMiddleware = (req, res, next) => {
    const delayParam = req.query.delay;
    const delayMs = delayParam ? parseInt(delayParam, 10) : 0;
    if (delayMs > 0 && !isNaN(delayMs)) {
        // Cap at 10 seconds to avoid server timeouts
        const actualDelay = Math.min(delayMs, 10000);
        setTimeout(next, actualDelay);
    }
    else {
        next();
    }
};
app.use(delayMiddleware);
// 2. Authentication Middleware
// Token scheme: Bearer <id>_<role>
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }
    const token = authHeader.substring(7); // Strip 'Bearer '
    const parts = token.split('_');
    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Access denied. Malformed token.' });
    }
    const userId = parseInt(parts[0], 10);
    const role = parts[1];
    if (isNaN(userId) || (role !== 'Admin' && role !== 'General User')) {
        return res.status(401).json({ error: 'Access denied. Invalid token claims.' });
    }
    req.user = { id: userId, role };
    next();
};
// 3. Admin-only Authorization Middleware
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
    }
    next();
};
// --- API ROUTES ---
// Login route
app.post('/api/auth/login', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required.' });
    }
    const authenticatedUser = db_service_1.dbService.authenticate(username, password, role);
    if (!authenticatedUser) {
        return res.status(401).json({ error: 'Invalid credentials or role selected.' });
    }
    // Generate a mock token
    const token = `${authenticatedUser.id}_${authenticatedUser.role}`;
    return res.json({
        success: true,
        message: 'Authentication successful',
        token,
        user: authenticatedUser
    });
});
// Get user profile (details)
app.get('/api/users/profile', authMiddleware, (req, res) => {
    if (!req.user)
        return res.status(500).json({ error: 'User context missing.' });
    const users = db_service_1.dbService.getUsers();
    const profile = users.find(u => Number(u.id) === Number(req.user.id));
    if (!profile) {
        return res.status(404).json({ error: 'Profile not found.' });
    }
    return res.json({ profile });
});
// Get verification records
app.get('/api/records', authMiddleware, (req, res) => {
    if (!req.user)
        return res.status(500).json({ error: 'User context missing.' });
    const records = db_service_1.dbService.getRecords(req.user.id, req.user.role);
    return res.json({ records });
});
// --- ADMIN MANAGEMENT ROUTES ---
// Get all users
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    const users = db_service_1.dbService.getUsers();
    return res.json({ users });
});
// Create new user
app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    const { username, password, role, fullName, email, designation, department } = req.body;
    if (!username || !role || !fullName || !email) {
        return res.status(400).json({ error: 'Username, role, full name, and email are required.' });
    }
    // Check if username already exists
    const existingUser = db_service_1.dbService.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
        return res.status(409).json({ error: 'Username is already taken.' });
    }
    const createdUser = db_service_1.dbService.addUser({
        username,
        password,
        role,
        fullName,
        email,
        designation,
        department
    });
    return res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: createdUser
    });
});
// Update user details
app.put('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    const { username, password, role, fullName, email, designation, department } = req.body;
    const updatedUser = db_service_1.dbService.updateUser(userId, {
        username,
        password,
        role,
        fullName,
        email,
        designation,
        department
    });
    if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
        success: true,
        message: 'User updated successfully',
        user: updatedUser
    });
});
// Delete user
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
    }
    // Prevent self-deletion
    if (req.user && Number(req.user.id) === userId) {
        return res.status(400).json({ error: 'Cannot delete your own administrative account.' });
    }
    const deleted = db_service_1.dbService.deleteUser(userId);
    if (!deleted) {
        return res.status(404).json({ error: 'User not found' });
    }
    return res.json({
        success: true,
        message: 'User deleted successfully'
    });
});
// Start Express App
app.listen(PORT, () => {
    console.log(`[MPloyChek Server] API running at http://localhost:${PORT}`);
});

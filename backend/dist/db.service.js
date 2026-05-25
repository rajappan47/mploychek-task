"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbService = void 0;
const fast_xml_parser_1 = require("fast-xml-parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DB_PATH = path.join(__dirname, '../database/db.xml');
class DbService {
    parser;
    builder;
    constructor() {
        this.parser = new fast_xml_parser_1.XMLParser({
            ignoreAttributes: false,
            parseTagValue: true,
            parseAttributeValue: true,
            trimValues: true,
            isArray: (name) => ['user', 'record'].includes(name)
        });
        this.builder = new fast_xml_parser_1.XMLBuilder({
            format: true,
            ignoreAttributes: false
        });
        // Ensure database folder exists
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }
    readDb() {
        try {
            if (!fs.existsSync(DB_PATH)) {
                return { database: { users: { user: [] }, records: { record: [] } } };
            }
            const xmlData = fs.readFileSync(DB_PATH, 'utf-8');
            const parsed = this.parser.parse(xmlData);
            // Ensure arrays exist
            if (!parsed.database) {
                parsed.database = {};
            }
            if (!parsed.database.users) {
                parsed.database.users = { user: [] };
            }
            if (!parsed.database.users.user) {
                parsed.database.users.user = [];
            }
            if (!parsed.database.records) {
                parsed.database.records = { record: [] };
            }
            if (!parsed.database.records.record) {
                parsed.database.records.record = [];
            }
            return parsed;
        }
        catch (error) {
            console.error('Failed to read XML DB:', error);
            return { database: { users: { user: [] }, records: { record: [] } } };
        }
    }
    writeDb(data) {
        try {
            const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + this.builder.build(data);
            fs.writeFileSync(DB_PATH, xmlContent, 'utf-8');
        }
        catch (error) {
            console.error('Failed to write XML DB:', error);
        }
    }
    // --- User Operations ---
    getUsers() {
        const db = this.readDb();
        // Strip passwords before returning
        return (db.database.users?.user || []).map(u => {
            const { password, ...userWithoutPassword } = u;
            return userWithoutPassword;
        });
    }
    authenticate(username, password, role) {
        const db = this.readDb();
        const user = (db.database.users?.user || []).find(u => u.username.toLowerCase() === username.toLowerCase() &&
            u.password === password &&
            u.role === role);
        if (user) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
        return null;
    }
    addUser(userData) {
        const db = this.readDb();
        const users = db.database.users?.user || [];
        // Auto-increment ID
        const nextId = users.length > 0 ? Math.max(...users.map(u => Number(u.id))) + 1 : 1;
        const newUser = {
            id: nextId,
            username: userData.username,
            password: userData.password || 'welcome123', // default password
            role: userData.role,
            fullName: userData.fullName,
            email: userData.email,
            designation: userData.designation,
            department: userData.department
        };
        users.push(newUser);
        db.database.users = { user: users };
        this.writeDb(db);
        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }
    updateUser(id, userData) {
        const db = this.readDb();
        const users = db.database.users?.user || [];
        const index = users.findIndex(u => Number(u.id) === Number(id));
        if (index === -1)
            return null;
        // Merge updates
        const existing = users[index];
        const updatedUser = {
            ...existing,
            ...userData,
            id: existing.id // ID cannot be updated
        };
        users[index] = updatedUser;
        db.database.users = { user: users };
        this.writeDb(db);
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
    deleteUser(id) {
        const db = this.readDb();
        const users = db.database.users?.user || [];
        const newUsers = users.filter(u => Number(u.id) !== Number(id));
        if (users.length === newUsers.length)
            return false;
        db.database.users = { user: newUsers };
        this.writeDb(db);
        return true;
    }
    // --- Records Operations ---
    getRecords(userId, role) {
        const db = this.readDb();
        const records = db.database.records?.record || [];
        if (role === 'Admin') {
            return records; // Admin sees all records
        }
        else {
            // General User sees only their assigned records
            return records.filter(r => Number(r.userId) === Number(userId));
        }
    }
}
exports.dbService = new DbService();

import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../database/db.xml');

export interface User {
  id: number;
  username: string;
  password?: string;
  role: 'Admin' | 'General User';
  fullName: string;
  email: string;
  designation: string;
  department: string;
}

export interface VerificationRecord {
  id: string;
  candidateName: string;
  email: string;
  checkType: string;
  company: string;
  status: 'Verified' | 'Discrepancy Found' | 'In Progress' | 'Failed';
  completionDate: string;
  userId: number;
}

export interface DBStructure {
  database: {
    users?: {
      user?: User[];
    };
    records?: {
      record?: VerificationRecord[];
    };
  };
}

class DbService {
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
      isArray: (name) => ['user', 'record'].includes(name)
    });

    this.builder = new XMLBuilder({
      format: true,
      ignoreAttributes: false
    });

    // Ensure database folder exists
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  private readDb(): DBStructure {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return { database: { users: { user: [] }, records: { record: [] } } };
      }
      const xmlData = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = this.parser.parse(xmlData) as DBStructure;
      
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
    } catch (error) {
      console.error('Failed to read XML DB:', error);
      return { database: { users: { user: [] }, records: { record: [] } } };
    }
  }

  private writeDb(data: DBStructure): void {
    try {
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + this.builder.build(data);
      fs.writeFileSync(DB_PATH, xmlContent, 'utf-8');
    } catch (error) {
      console.error('Failed to write XML DB:', error);
    }
  }

  // --- User Operations ---

  public getUsers(): User[] {
    const db = this.readDb();
    // Strip passwords before returning
    return (db.database.users?.user || []).map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword as User;
    });
  }

  public authenticate(username: string, password: string, role: string): User | null {
    const db = this.readDb();
    const user = (db.database.users?.user || []).find(
      u => u.username.toLowerCase() === username.toLowerCase() && 
           u.password === password && 
           u.role === role
    );
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    }
    return null;
  }

  public addUser(userData: Omit<User, 'id'> & { password?: string }): User {
    const db = this.readDb();
    const users = db.database.users?.user || [];
    
    // Auto-increment ID
    const nextId = users.length > 0 ? Math.max(...users.map(u => Number(u.id))) + 1 : 1;
    
    const newUser: User = {
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
    return userWithoutPassword as User;
  }

  public updateUser(id: number, userData: Partial<User> & { password?: string }): User | null {
    const db = this.readDb();
    const users = db.database.users?.user || [];
    const index = users.findIndex(u => Number(u.id) === Number(id));

    if (index === -1) return null;

    // Merge updates
    const existing = users[index];
    const updatedUser: User = {
      ...existing,
      ...userData,
      id: existing.id // ID cannot be updated
    };

    users[index] = updatedUser;
    db.database.users = { user: users };
    this.writeDb(db);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  public deleteUser(id: number): boolean {
    const db = this.readDb();
    const users = db.database.users?.user || [];
    const newUsers = users.filter(u => Number(u.id) !== Number(id));

    if (users.length === newUsers.length) return false;

    db.database.users = { user: newUsers };
    this.writeDb(db);
    return true;
  }

  // --- Records Operations ---

  public getRecords(userId: number, role: 'Admin' | 'General User'): VerificationRecord[] {
    const db = this.readDb();
    const records = db.database.records?.record || [];

    if (role === 'Admin') {
      return records; // Admin sees all records
    } else {
      // General User sees only their assigned records
      return records.filter(r => Number(r.userId) === Number(userId));
    }
  }
}

export const dbService = new DbService();

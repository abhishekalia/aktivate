import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface ContactSubmission {
  name: string;
  email: string;
  company: string;
  message: string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveContact(contact: ContactSubmission): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async saveContact(contact: ContactSubmission): Promise<void> {
    const { name, email, company, message } = contact;
    const timestamp = new Date().toISOString();
    console.log(`[CONTACT FORM] ${timestamp}`);
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Company: ${company}`);
    console.log(`  Message: ${message}`);
    console.log(`  → Forward to: abhishekwork.ak@gmail.com`);
  }
}

export const storage = new MemStorage();

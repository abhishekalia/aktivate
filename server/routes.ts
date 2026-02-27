import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, company, message } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      await storage.saveContact({ name, email, company: company || "", message: message || "" });
      res.json({ success: true });
    } catch (err) {
      console.error("Contact form error:", err);
      res.status(500).json({ error: "Failed to save contact" });
    }
  });

  return httpServer;
}

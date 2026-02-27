import type { Express } from "express";
import { createServer, type Server } from "http";
import { Resend } from "resend";
import { storage } from "./storage";

const resend = new Resend(process.env.RESEND_API_KEY);

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

      try {
        const emailResult = await resend.emails.send({
          from: "Aktivate Contact <onboarding@resend.dev>",
          to: "ak@myspark.cc",
          subject: `New Contact: ${name}`,
          html: `<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Company:</strong> ${company || "N/A"}</p>
<p><strong>Message:</strong> ${message || "N/A"}</p>`,
        });
        console.log("Resend result:", JSON.stringify(emailResult));
      } catch (emailErr) {
        console.error("Resend email error (contact still saved):", emailErr);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Contact form error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  return httpServer;
}

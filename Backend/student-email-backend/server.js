require("dotenv").config(); // Load environment variables

console.log("Loaded SENDGRID_API_KEY:", process.env.SENDGRID_API_KEY ? "✅ OK" : "❌ Missing");

const express = require("express");
const cors = require("cors");
const sgMail = require("@sendgrid/mail");
const admin = require("firebase-admin"); // Required for auth
const db = require("./firebase");        // Handles initialization safely

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Your SendGrid API Key

console.log("📡 Notification email service started...");   

const sendEmailsForNewNotifications = async () => {
  try {
    const snapshot = await db.collection("notifications")
      .where("sent", "==", null)
      .get();

    if (snapshot.empty) {
      console.log("❌ No new unsent notifications found.");
      return;
    }

    console.log(`📬 Found ${snapshot.size} unsent notification(s)`);

    snapshot.forEach(async (doc) => {
      const data = doc.data();
      console.log("📝 Notification data:", data);

      if (!data.recipients || data.recipients.length === 0) {
        console.warn(`⚠️ Notification '${doc.id}' has no recipients.`);
        return;
      }

      for (const email of data.recipients) {
        const msg = {
          to: email,
          from: "neharangdal.04@gmail.com", // Must be verified in SendGrid
          subject: data.title || "New Notification",
          html: `
            <h3>${data.title || "Notification"}</h3>
            <p><strong>From:</strong> ${data.senderEmail || "Unknown"} (${data.senderRole || "Admin"})</p>
            <p><strong>To:</strong> ${data.targetRoles?.join(", ") || "All"}</p>
            <p><strong>Message:</strong><br>${data.message}</p>
            <p><strong>Time:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
          `,
        };

        try {
          await sgMail.send(msg);
          console.log(`✅ Email sent to ${email}`);
        } catch (error) {
          console.error(`❌ SendGrid error for ${email}:`, error.response?.body || error.message);
        }
      }

      await db.collection("notifications").doc(doc.id).update({ sent: true });
      console.log(`📌 Notification '${doc.id}' marked as sent.`);
    });
  } catch (err) {
    console.error("🔥 Error fetching notifications:", err.message);
  }
};

// 🔁 Check every 15 seconds
setInterval(sendEmailsForNewNotifications, 15000);

// ==========================
// ✅ Forgot Password Endpoint
// ==========================

const app = express();
app.use(cors({
  origin: ["http://localhost:3000", "https://your-frontend-domain.com"], // add your frontend prod domain too
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

app.post("/api/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    const msg = {
      to: email,
      from: "neharangdal.04@gmail.com", // Must be verified in SendGrid
      subject: "Reset your password",
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetLink}">Click here to reset your password</a></p>
        <p>This link will expire in 1 hour. If you didn’t request this, please ignore this email.</p>
      `,
    };

    await sgMail.send(msg);
    res.json({ message: "Reset link sent to your email." });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ error: "Failed to send reset email." });
  }
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

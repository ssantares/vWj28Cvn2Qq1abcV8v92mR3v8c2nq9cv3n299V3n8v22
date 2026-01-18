const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || "antares8282jviwm1lapci2n1d";

// In-memory storage for simplicity
const sessions = {};
const keys = {}; // key: true if used

// Generate a session
app.post("/session", (req, res) => {
  const sessionId = uuid();
  sessions[sessionId] = { created: Date.now() };
  res.json({ session: sessionId });
});

// Redeem a key
app.post("/redeem", (req, res) => {
  const { session, key, playerId } = req.body;
  if (!session || !sessions[session]) return res.status(400).json({ success: false, error: "Invalid session" });
  if (!key) return res.status(400).json({ success: false, error: "Missing key" });

  if (keys[key]) {
    return res.json({ success: false }); // already used
  }

  // Mark key as used
  keys[key] = true;
  res.json({ success: true });
});

// Admin endpoint to generate keys
app.post("/genkey", (req, res) => {
  const secret = req.headers["x-admin-secret"];
  if (secret !== ADMIN_SECRET) return res.status(403).json({ error: "Invalid admin secret" });

  const newKey = uuid().replace(/-/g, "").slice(0, 32); // 32-char key
  keys[newKey] = false; // not used
  res.json({ key: newKey });
});

app.listen(PORT, () => {
  console.log(`Antares server running on port ${PORT}`);
});

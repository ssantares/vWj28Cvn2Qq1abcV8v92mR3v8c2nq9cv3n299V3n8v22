const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { v4: uuid } = require("uuid");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const ADMIN_SECRET = process.env.ADMIN_SECRET; // must match your Lua script environment

let keys = {};
let sessions = {};

// Generate session
app.post("/session", (req, res) => {
    const sessionId = uuid();
    sessions[sessionId] = true;
    res.json({ session: sessionId });
});

// Redeem key
app.post("/redeem", (req, res) => {
    const { session, key, playerId } = req.body;
    if (!sessions[session]) return res.status(403).json({ success: false, error: "Invalid session" });
    if (!keys[key]) return res.status(403).json({ success: false, error: "Invalid key" });
    delete sessions[session];
    keys[key] = playerId; // mark key as used
    res.json({ success: true });
});

// Generate new key (admin only)
app.post("/genkey", (req, res) => {
    if (req.headers["x-admin-secret"] !== ADMIN_SECRET) return res.status(403).json({ error: "Forbidden" });
    const key = uuid().replace(/-/g, "").slice(0, 24);
    keys[key] = null; // not used yet
    res.json({ key });
});

app.listen(process.env.PORT || 3000, () => console.log("Server running"));

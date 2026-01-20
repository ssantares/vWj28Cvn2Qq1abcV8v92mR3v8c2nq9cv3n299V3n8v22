import express from "express";
import fs from "fs";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// ---------- storage ----------
const DATA_FILE = "./keys.json";
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "{}");

function loadKeys() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function saveKeys(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- helpers ----------
function randomKey() {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

// ---------- PUBLIC ----------
app.post("/session", (req, res) => {
  res.json({ session: crypto.randomUUID() });
});

app.post("/redeem", (req, res) => {
  const { key, playerId } = req.body;
  if (!key || !playerId) {
    return res.status(400).json({ success: false });
  }

  const keys = loadKeys();
  const entry = keys[key];

  if (!entry) {
    return res.json({ success: false });
  }

  const now = Date.now();

  // expired
  if (entry.expiresAt && now > entry.expiresAt) {
    delete keys[key];
    saveKeys(keys);
    return res.json({ success: false });
  }

  // already claimed
  if (entry.playerId && entry.playerId !== playerId) {
    return res.json({ success: false });
  }

  // bind key on first redeem
  entry.playerId = entry.playerId || playerId;
  saveKeys(keys);

  return res.json({ success: true });
});

// ---------- ADMIN ----------
app.get("/genkey", (req, res) => {
  if (req.headers["x-admin-secret"] !== ADMIN_SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const tier = req.query.tier;
  const keys = loadKeys();

  let prefix, duration;
  if (tier === "trial") {
    prefix = "ANTARES-T-";
    duration = 14 * 24 * 60 * 60 * 1000;
  } else if (tier === "monthly") {
    prefix = "ANTARES-M-";
    duration = 30 * 24 * 60 * 60 * 1000;
  } else if (tier === "perm") {
    prefix = "ANTARES-P-";
    duration = null;
  } else {
    return res.status(400).json({ error: "invalid tier" });
  }

  const key = prefix + randomKey();
  keys[key] = {
    tier,
    playerId: tier === "trial" ? null : null,
    expiresAt: duration ? Date.now() + duration : null
  };

  saveKeys(keys);
  res.json({ key });
});

app.listen(PORT, () => {
  console.log("Antares server running on port", PORT);
});

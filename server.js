const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const app = express();

app.use(express.json());

const KEYS_FILE = "./keys.json";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "changeme";

// Ensure keys.json exists
if (!fs.existsSync(KEYS_FILE)) {
    fs.writeFileSync(KEYS_FILE, "{}");
}

function loadKeys() {
    return JSON.parse(fs.readFileSync(KEYS_FILE, "utf8"));
}

function saveKeys(keys) {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function randomPart(len = 8) {
    return crypto.randomBytes(len).toString("hex").toUpperCase().slice(0, len);
}

function generateKey(tier) {
    if (tier === "trial") return `ANTARES-T-${randomPart(10)}`;
    if (tier === "monthly") return `ANTARES-M-${randomPart(6)}`;
    if (tier === "permanent") return `ANTARES-P-${randomPart(9)}`;
    throw new Error("Invalid tier");
}

// ===================
// Generate key
// ===================
app.get("/genkey", (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const tier = req.query.tier;
    if (!["trial", "monthly", "permanent"].includes(tier)) {
        return res.status(400).json({ error: "Invalid tier" });
    }

    const keys = loadKeys();
    const key = generateKey(tier);

    let duration = null;
    if (tier === "trial") duration = 14 * 24 * 60 * 60 * 1000;
    if (tier === "monthly") duration = 30 * 24 * 60 * 60 * 1000;

    keys[key] = {
        tier,
        createdAt: Date.now(),
        duration,          // null = permanent
        redeemedBy: null,
        redeemedAt: null
    };

    saveKeys(keys);
    res.json({ key, tier });
});

// ===================
// Session
// ===================
app.post("/session", (req, res) => {
    res.json({
        session: crypto.randomUUID()
    });
});

// ===================
// Redeem key
// ===================
app.post("/redeem", (req, res) => {
    const { key, playerId } = req.body;
    if (!key || !playerId) {
        return res.json({ success: false });
    }

    const keys = loadKeys();
    const data = keys[key];
    if (!data) return res.json({ success: false });

    // Expiration check
    if (data.duration) {
        if (Date.now() > data.createdAt + data.duration) {
            return res.json({ success: false });
        }
    }

    // Trial = universal
    if (data.tier === "trial") {
        return res.json({ success: true });
    }

    // Monthly / Permanent = bind on first use
    if (!data.redeemedBy) {
        data.redeemedBy = playerId;
        data.redeemedAt = Date.now();
        saveKeys(keys);
        return res.json({ success: true });
    }

    // Must match bound player
    if (data.redeemedBy === playerId) {
        return res.json({ success: true });
    }

    return res.json({ success: false });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Antares server running"));

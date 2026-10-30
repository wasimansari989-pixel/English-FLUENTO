const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_DIR = path.resolve(__dirname, '../../data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load or initialize leaderboard store
function loadStore() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const content = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading leaderboard file:', err);
  }
  return { users: {} };
}

function saveStore(store) {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving leaderboard file:', err);
  }
}

// Helpers for current week / month keys
function getWeekKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Sanitize display name for privacy
function sanitizeDisplayName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Fluent Learner';
  let clean = rawName.trim().replace(/[<>]/g, '');
  if (clean.includes('@')) {
    // Mask email for privacy: e.g. "alex.smith@gmail.com" -> "Alex S."
    const parts = clean.split('@')[0].split('.');
    const first = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Learner';
    const last = parts[1] ? ` ${parts[1].charAt(0).toUpperCase()}.` : '';
    clean = `${first}${last}`;
  }
  return clean.slice(0, 24);
}

// GET /api/leaderboard?period=weekly|monthly|all-time&userId=...
router.get('/', (req, res) => {
  const period = req.query.period || 'weekly';
  const queryUserId = req.query.userId;
  const store = loadStore();

  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();

  const entries = Object.values(store.users).map((user) => {
    let xp = user.allTimeXp || 0;
    if (period === 'weekly') {
      xp = user.weekKey === currentWeek ? (user.weeklyXp || 0) : 0;
    } else if (period === 'monthly') {
      xp = user.monthKey === currentMonth ? (user.monthlyXp || 0) : 0;
    }

    return {
      userId: user.userId,
      displayName: user.displayName || 'Fluent Learner',
      avatar: user.avatar || 'happy-outline',
      xp,
      level: user.level || 1,
      levelTitle: user.levelTitle || 'Novice Explorer',
      streak: user.streak || 1,
    };
  });

  // Sort descending by XP
  entries.sort((a, b) => b.xp - a.xp);

  // Assign ranks
  const ranked = entries.map((e, idx) => ({
    ...e,
    rank: idx + 1,
    isCurrentUser: queryUserId ? e.userId === queryUserId : false,
  }));

  const topRankings = ranked.slice(0, 50);
  const userRanking = queryUserId ? ranked.find((e) => e.userId === queryUserId) : undefined;

  res.json({
    period,
    rankings: topRankings,
    userRanking: userRanking || null,
    totalLearners: ranked.length,
    updatedAt: new Date().toISOString(),
  });
});

// POST /api/leaderboard/sync
router.post('/sync', (req, res) => {
  const {
    userId,
    displayName,
    avatar,
    totalXp,
    level,
    levelTitle,
    streak,
  } = req.body;

  if (!userId || typeof totalXp !== 'number') {
    return res.status(400).json({ error: 'Missing userId or totalXp' });
  }

  const store = loadStore();
  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();

  const existing = store.users[userId] || {
    userId,
    allTimeXp: 0,
    weeklyXp: 0,
    monthlyXp: 0,
    weekKey: currentWeek,
    monthKey: currentMonth,
  };

  // Anti-cheat verification: prevent unrealistic sudden massive XP jumps (>1000 XP in one sync)
  const currentAllTime = existing.allTimeXp || 0;
  let validatedXp = Math.max(currentAllTime, Math.min(totalXp, currentAllTime + 800));

  // Reset weekly / monthly if key rolled over
  let weeklyXp = existing.weekKey === currentWeek ? (existing.weeklyXp || 0) : 0;
  let monthlyXp = existing.monthKey === currentMonth ? (existing.monthlyXp || 0) : 0;

  const xpDelta = validatedXp - currentAllTime;
  if (xpDelta > 0) {
    weeklyXp += xpDelta;
    monthlyXp += xpDelta;
  }

  const cleanName = sanitizeDisplayName(displayName);

  store.users[userId] = {
    userId,
    displayName: cleanName,
    avatar: avatar || 'happy-outline',
    allTimeXp: validatedXp,
    weeklyXp,
    monthlyXp,
    weekKey: currentWeek,
    monthKey: currentMonth,
    level: level || 1,
    levelTitle: levelTitle || 'Novice Explorer',
    streak: streak || 1,
    lastActiveAt: new Date().toISOString(),
  };

  saveStore(store);

  res.json({
    success: true,
    userId,
    allTimeXp: validatedXp,
    weeklyXp,
    monthlyXp,
    syncedAt: new Date().toISOString(),
  });
});

module.exports = router;


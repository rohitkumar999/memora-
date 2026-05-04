const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

function createDefaultDb() {
  return {
    users: [],
    members: [],
    sessions: [],
    topics: [],
    reminders: [],
    studyLogs: [],
    lastActions: [],
  };
}

function buildMemberFromUser(user) {
  return {
    id: user.id,
    linkedUserId: user.id,
    name: user.name || 'Unknown Member',
    email: user.email || '',
    year: '3rd Year',
    degree: 'B.Tech',
    role: 'Team Member',
    about: 'Memora team member profile',
    createdAt: new Date().toISOString(),
  };
}

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createDefaultDb(), null, 2));
    return;
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  let changed = false;

  if (!Array.isArray(db.members)) {
    db.members = [];
    changed = true;
  }

  for (const user of db.users || []) {
    const alreadyExists = db.members.some((member) => member.linkedUserId === user.id || member.id === user.id);
    if (!alreadyExists) {
      db.members.push(buildMemberFromUser(user));
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
}

function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = { readDb, writeDb, createDefaultDb };

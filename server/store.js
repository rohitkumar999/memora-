const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

function createDefaultDb() {
  return {
    users: [],
    sessions: [],
    topics: [],
    reminders: [],
    studyLogs: [],
    lastActions: [],
  };
}

function ensureDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createDefaultDb(), null, 2));
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

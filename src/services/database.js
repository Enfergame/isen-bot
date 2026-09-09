const fs = require('fs');
const path = require('path');
const { dbPath } = require('../config');

const jsonPath = dbPath.replace(/\.sqlite$/, '.json');

function ensureFile() {
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(jsonPath)) fs.writeFileSync(jsonPath, JSON.stringify({}), 'utf8');
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeAll(data) {
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
}

function saveCredentials(discordId, isenUsername, encryptedPassword) {
  const data = readAll();
  const now = new Date().toISOString();
  const existing = data[discordId] || {};
  data[discordId] = {
    ...existing,
    discord_id: discordId,
    isen_username: isenUsername,
    isen_password_encrypted: encryptedPassword,
    created_at: existing.created_at || now,
    updated_at: now,
  };
  writeAll(data);
}

function updateStudentState(discordId, state) {
  const data = readAll();
  if (!data[discordId]) return;
  data[discordId] = { ...data[discordId], ...state, updated_at: new Date().toISOString() };
  writeAll(data);
}

function getAllCredentials() {
  return Object.values(readAll());
}

function getCredentials(discordId) {
  const data = readAll();
  return data[discordId] || null;
}

function deleteCredentials(discordId) {
  const data = readAll();
  delete data[discordId];
  writeAll(data);
}

function setChannelId(discordId, channelId) {
  updateStudentState(discordId, { channel_id: channelId });
}

function setOriginalNickname(discordId, originalNickname) {
  updateStudentState(discordId, { original_nickname: originalNickname });
}

function updateLastKnownGrades(discordId, signaturesArray) {
  updateStudentState(discordId, { last_known_grades: JSON.stringify(signaturesArray) });
}

function updateLastKnownAbsences(discordId, signaturesArray) {
  updateStudentState(discordId, { last_known_absences: JSON.stringify(signaturesArray) });
}

module.exports = {
  saveCredentials,
  getCredentials,
  getAllCredentials,
  deleteCredentials,
  setChannelId,
  setOriginalNickname,
  updateStudentState,
  updateLastKnownGrades,
  updateLastKnownAbsences,
};

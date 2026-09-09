const axios = require('axios');
const { apiBaseUrl } = require('../config');
const { decrypt, encrypt } = require('../utils/encryption');
const { updateStudentState } = require('./database');

async function getToken(credentials) {
  if (credentials.aurion_token_encrypted && credentials.token_expires_at && new Date(credentials.token_expires_at) > new Date(Date.now() + 60 * 1000)) {
    return decrypt(credentials.aurion_token_encrypted);
  }
  const response = await axios.post(`${apiBaseUrl}/v1/token`, {
    username: credentials.isen_username,
    password: decrypt(credentials.isen_password_encrypted),
  });
  const token = typeof response.data === 'string' ? response.data : response.data.token;
  if (!token) throw new Error('L’API ISEN n’a pas renvoyé de token');
  updateStudentState(credentials.discord_id, {
    aurion_token_encrypted: encrypt(token),
    token_expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
  });
  return token;
}

async function fetchStudentData(credentials) {
  const token = await getToken(credentials);
  const headers = { Token: token };
  const [notations, absences] = await Promise.all([
    axios.get(`${apiBaseUrl}/v1/notations`, { headers }),
    axios.get(`${apiBaseUrl}/v1/absences`, { headers }),
  ]);
  return {
    grades: Array.isArray(notations.data) ? notations.data : [],
    absences: Array.isArray(absences.data) ? absences.data : [],
  };
}

module.exports = { fetchStudentData };
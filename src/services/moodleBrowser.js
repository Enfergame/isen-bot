const axios = require('axios');
const { moodleBaseUrl } = require('../config');
const { decrypt } = require('../utils/encryption');

function stripHtml(value = '') {
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&eacute;/gi, 'é')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ecirc;/gi, 'ê')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&ocirc;/gi, 'ô')
    .replace(/&rsquo;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const cleaned = String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const numeric = Number(cleaned);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseGradeRowsFromHtml(html, courseName = 'Matière') {
  const rows = [...String(html).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const results = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((match) => stripHtml(match[1]));
    if (cells.length < 3) continue;

    const text = cells.join(' | ');
    if (!/Devoir|Test|QCM|Quiz|Contrôle|Projet|Evaluation|évaluation/i.test(text)) continue;
    if (/Moyenne des notes|Tendance centrale|Total de|Total du cours/i.test(text)) continue;

    const assessmentCell = cells.find((cell) => /Devoir|Test|QCM|Quiz|Contrôle|Projet|Evaluation|évaluation/i.test(cell));
    const noteCell = cells.find((cell) => /\d/.test(cell) && !/Valeurs possibles|Pondération|Pourcentage/i.test(cell));
    const maxCell = cells.find((cell) => /\d.*[–-].*\d|\d\s*\/\s*\d|\d\s*–\s*\d|\d\s*-\s*\d/i.test(cell));

    if (!assessmentCell || !noteCell) continue;

    let assessment = stripHtml(assessmentCell)
      .replace(/^\s*(?:Devoir|Test|QCM|Quiz|Contrôle|Projet)\s+/i, '')
      .trim();

    const gradeValue = normalizeNumber((noteCell.match(/\d+[.,]\d+|\d+/) || [])[0]);
    const maxValue = normalizeNumber((maxCell || '').match(/\d+[.,]?\d*/)?.[0]);

    if (!assessment) assessment = 'Évaluation';
    if (gradeValue === null) continue;
    if (maxValue === null) continue;

    results.push({
      subject: courseName,
      assessment,
      grade: gradeValue,
      max_grade: maxValue,
      coefficient: null,
      date: '',
      code: `${courseName}:${assessment}`,
    });
  }

  return results;
}

function getMoodleLoginFormToken(html) {
  const match = String(html).match(/name=["']logintoken["'][^>]*value=["']([^"']+)["']/i);
  return match ? match[1] : '';
}

async function fetchMoodleGradePage(credentials) {
  const baseUrl = `${moodleBaseUrl}/cours`;
  const password = decrypt(credentials.isen_password_encrypted);

  const loginPage = await axios.get(`${baseUrl}/login/index.php`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 20000,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const loginCookies = (loginPage.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]).join('; ');
  const token = getMoodleLoginFormToken(loginPage.data || '');
  if (!token) {
    throw new Error('Moodle login token unavailable');
  }

  const authResponse = await axios.post(
    `${baseUrl}/login/index.php`,
    new URLSearchParams({
      username: credentials.isen_username,
      password,
      logintoken: token,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: loginCookies,
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 20000,
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
    }
  );

  const allCookies = [...(loginPage.headers['set-cookie'] || []), ...(authResponse.headers['set-cookie'] || [])]
    .map((cookie) => cookie.split(';')[0])
    .join('; ');

  const reportUrl = `${baseUrl}/grade/report/user/index.php?id=574`;
  const reportPage = await axios.get(reportUrl, {
    headers: {
      Cookie: allCookies,
      'User-Agent': 'Mozilla/5.0',
    },
    timeout: 20000,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const title = (reportPage.data || '').match(/<title>([^<]+)<\/title>/i)?.[1] || 'Matière';
  const courseName = stripHtml(title).split('|').slice(1, 2)[0] || 'Matière';

  return {
    courseName,
    html: reportPage.data || '',
    cookies: allCookies,
  };
}

async function logoutMoodleSession(cookies) {
  if (!cookies) return;
  const logoutUrl = `${moodleBaseUrl}/cours/login/logout.php`;
  await axios.get(logoutUrl, {
    headers: { Cookie: cookies, 'User-Agent': 'Mozilla/5.0' },
    timeout: 20000,
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  }).catch(() => {});
}

module.exports = {
  fetchMoodleGradePage,
  logoutMoodleSession,
  parseGradeRowsFromHtml,
  stripHtml,
};

const axios = require('axios');
const { apiBaseUrl, moodleBaseUrl, moodleServiceName } = require('../config');
const { decrypt, encrypt } = require('../utils/encryption');
const { updateStudentState } = require('./database');

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getToken(credentials) {
  if (credentials.aurion_token_encrypted && credentials.token_expires_at && new Date(credentials.token_expires_at) > new Date(Date.now() + 60 * 1000)) {
    return decrypt(credentials.aurion_token_encrypted);
  }

  const authSourceBaseUrl = moodleBaseUrl || apiBaseUrl || 'https://educ.isen-mediterranee.fr';
  const password = decrypt(credentials.isen_password_encrypted);

  if (authSourceBaseUrl.includes('educ.isen-mediterranee.fr') || authSourceBaseUrl.includes('moodle')) {
    const response = await axios.get(`${authSourceBaseUrl}/login/token.php`, {
      params: {
        username: credentials.isen_username,
        password,
        service: moodleServiceName,
      },
      timeout: 20000,
    });

    const token = response.data && response.data.token ? response.data.token : null;
    if (!token) throw new Error('Moodle n’a pas renvoyé de token d’API');

    updateStudentState(credentials.discord_id, {
      aurion_token_encrypted: encrypt(token),
      token_expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
    });
    return token;
  }

  const response = await axios.post(`${apiBaseUrl}/v1/token`, {
    username: credentials.isen_username,
    password,
  });
  const token = typeof response.data === 'string' ? response.data : response.data.token;
  if (!token) throw new Error('L’API ISEN n’a pas renvoyé de token');
  updateStudentState(credentials.discord_id, {
    aurion_token_encrypted: encrypt(token),
    token_expires_at: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
  });
  return token;
}

function normalizeMoodleGradeEntry(course, item) {
  if (!item) return null;

  const rawGrade = item.grades && item.grades[0] ? item.grades[0].grade ?? item.grades[0].rawgrade : null;
  const numericGrade = toNumber(rawGrade, null);
  if (numericGrade === null) return null;

  const gradeItemName = item.itemname || 'Évaluation';
  const courseName = course?.shortname || course?.fullname || 'Matière';

  return {
    subject: courseName,
    assessment: gradeItemName,
    grade: numericGrade,
    max_grade: toNumber(item.grademax, null),
    coefficient: toNumber(item.weight ?? item.aggregationcoef ?? item.multfactor, null),
    date: item?.dates && item.dates[0] ? item.dates[0].date : '',
    code: item.id ? String(item.id) : `${course?.id ?? 'course'}:${gradeItemName}`,
  };
}

async function fetchMoodleGrades(credentials) {
  const token = await getToken(credentials);
  const serviceUrl = `${moodleBaseUrl}/webservice/rest/server.php`;

  const coursesResponse = await axios.get(serviceUrl, {
    params: {
      wstoken: token,
      wsfunction: 'core_enrol_get_users_courses',
      moodlewsrestformat: 'json',
    },
    timeout: 20000,
  });

  const courses = Array.isArray(coursesResponse.data) ? coursesResponse.data : [];
  const entries = [];

  for (const course of courses) {
    try {
      const response = await axios.get(serviceUrl, {
        params: {
          wstoken: token,
          wsfunction: 'gradereport_user_get_grade_items',
          moodlewsrestformat: 'json',
          courseid: course.id,
        },
        timeout: 20000,
      });

      const usergrades = Array.isArray(response.data && response.data.usergrades) ? response.data.usergrades : [];
      for (const usergrade of usergrades) {
        const items = Array.isArray(usergrade.gradeitems) ? usergrade.gradeitems : [];
        for (const item of items) {
          const normalized = normalizeMoodleGradeEntry(course, item);
          if (normalized) entries.push(normalized);
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 401) throw error;
    }
  }

  return entries;
}

async function fetchStudentData(credentials) {
  const base = moodleBaseUrl || apiBaseUrl || 'https://educ.isen-mediterranee.fr';

  if (base.includes('educ.isen-mediterranee.fr') || base.includes('moodle')) {
    const grades = await fetchMoodleGrades(credentials);
    return { grades, absences: [] };
  }

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

module.exports = { fetchStudentData, getToken, fetchMoodleGrades, normalizeMoodleGradeEntry };
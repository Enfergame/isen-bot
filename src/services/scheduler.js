const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const { timezone, guildId } = require('../config');
const { getAllCredentials, updateStudentState, deleteCredentials } = require('./database');
const { fetchPlanning } = require('./planningService');
const { fetchStudentData } = require('./isenApi');
const { buildDailyPlanningEmbed } = require('../utils/embedBuilder');
const { ensureStudentChannel, deleteStudentChannel } = require('./studentSpace');

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function gradeKey(grade) {
  return JSON.stringify([grade.date, grade.code, grade.name, grade.note, grade.teachers]);
}

function absenceKey(absence) {
  return JSON.stringify([absence.date, absence.hours, absence.subject, absence.course]);
}

function isUnexcused(absence) {
  const reason = String(absence.reason || absence.absenceReason || '').toLowerCase();
  return reason.includes('injust') || reason.includes('non just') || reason.includes('unexcused');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function gradeEmbed(grade) {
  const embed = new EmbedBuilder().setTitle('📝 Nouvelle note').setColor(0x2f855a);
  const details = [
    ['Matière / évaluation', grade.name || grade.code || 'Non précisée'],
    ['Note', grade.note || 'Non précisée'],
    ['Date', grade.date || 'Non précisée'],
    ['Enseignant(s)', Array.isArray(grade.teachers) ? grade.teachers.join(', ') : grade.teachers],
    ['Commentaire', grade.comments],
    ['Motif d’absence', grade.absenceReason],
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());
  embed.addFields(details.map(([name, value]) => ({ name, value: String(value).slice(0, 1024) })));
  return embed;
}

function absenceEmbed(absences) {
  const embed = new EmbedBuilder().setTitle('⚠️ Nouvelle absence injustifiée').setColor(0xc53030);
  for (const absence of absences.slice(0, 10)) {
    embed.addFields({
      name: `${absence.date || 'Date inconnue'} | ${absence.subject || absence.course || 'Matière inconnue'}`,
      value: [absence.hours, absence.duration, absence.teachers && absence.teachers.join(', '), absence.reason]
        .filter(Boolean).join(' | ').slice(0, 1024) || 'Détail non communiqué',
    });
  }
  return embed;
}

async function getChannel(client, channelId) {
  if (!channelId) return null;
  try { return await client.channels.fetch(channelId); } catch { return null; }
}

async function pollStudent(client, credentials) {
  const channel = await getChannel(client, credentials.channel_id);
  if (!channel) return;
  try {
    const data = await fetchStudentData(credentials);
    const previousGrades = parseJson(credentials.last_known_grades, []);
    const previousAbsences = parseJson(credentials.last_known_absences, []);
    const firstPoll = !credentials.monitoring_initialized;
    const newGrades = firstPoll ? [] : data.grades.filter((grade) => !previousGrades.some((old) => gradeKey(old) === gradeKey(grade)));
    const unexcused = data.absences.filter(isUnexcused);
    const oldCount = Number(credentials.last_known_absence_count || 0);
    if (newGrades.length) for (const grade of newGrades) await channel.send({ embeds: [gradeEmbed(grade)] });
    if (!firstPoll && unexcused.length > oldCount) {
      const oldKeys = new Set(previousAbsences.map(absenceKey));
      const newAbsences = unexcused.filter((absence) => !oldKeys.has(absenceKey(absence)));
      await channel.send({ content: `<@${credentials.discord_id}>`, embeds: [absenceEmbed(newAbsences.length ? newAbsences : unexcused.slice(oldCount))], allowedMentions: { users: [credentials.discord_id] } });
    }
    updateStudentState(credentials.discord_id, {
      last_known_grades: JSON.stringify(data.grades),
      last_known_absence_count: unexcused.length,
      last_known_absences: JSON.stringify(unexcused),
      monitoring_initialized: 1,
    });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      await channel.send({
        content: `<@${credentials.discord_id}> tes identifiants ISEN ne fonctionnent plus. Utilise /login après avoir vérifié ton mot de passe.`,
        allowedMentions: { users: [credentials.discord_id] },
      });
      deleteCredentials(credentials.discord_id);
      return;
    }
    console.error(`Erreur de synchronisation ${credentials.discord_id}:`, error.message);
  }
}

async function sendDailyPlanning(client, credentials) {
  const channel = await getChannel(client, credentials.channel_id);
  if (!channel) return;
  try {
    const events = await fetchPlanning(credentials.isen_username);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await channel.send({ content: `<@${credentials.discord_id}>`, embeds: [buildDailyPlanningEmbed(events, tomorrow)], allowedMentions: { users: [credentials.discord_id] } });
  } catch (error) {
    console.error(`Erreur de planning quotidien ${credentials.discord_id}:`, error.message);
  }
}

async function provisionMissingSpaces(client) {
  const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
  if (!guild) return;
  for (const credentials of getAllCredentials()) {
    if (credentials.channel_id) continue;
    try {
      const member = await guild.members.fetch(credentials.discord_id);
      const channel = await ensureStudentChannel(guild, member.user, credentials.isen_username);
      updateStudentState(credentials.discord_id, { channel_id: channel.id });
    } catch (error) {
      if (error.code === 10007) {
        await deleteStudentChannel(client, credentials.channel_id, credentials.discord_id);
        deleteCredentials(credentials.discord_id);
        console.log(`Compte supprimé car le membre ${credentials.discord_id} a quitté le serveur`);
      } else {
        console.error(`Impossible de créer l'espace ${credentials.discord_id}:`, error.message);
      }
    }
  }
}

function startScheduler(client) {
  provisionMissingSpaces(client);
  cron.schedule('0 * * * *', async () => {
    for (const credentials of getAllCredentials()) await pollStudent(client, credentials);
  }, { timezone });
  cron.schedule('0 0 * * *', async () => {
    const credentialsList = getAllCredentials();
    for (let index = 0; index < credentialsList.length; index += 1) {
      if (index > 0) await wait(2000);
      await sendDailyPlanning(client, credentialsList[index]);
    }
  }, { timezone });
  console.log(`Scheduler élève actif (${timezone})`);
}

module.exports = { startScheduler, isUnexcused };
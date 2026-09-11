require('dotenv').config();

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  encryptionKey: process.env.ENCRYPTION_KEY,
  entBaseUrl: 'https://ent.isen-mediterranee.fr',
  moodleBaseUrl: process.env.MOODLE_BASE_URL || 'https://educ.isen-mediterranee.fr',
  moodleServiceName: process.env.MOODLE_SERVICE_NAME || 'moodle_mobile_app',
  apiBaseUrl: process.env.ISEN_API_URL || process.env.MOODLE_BASE_URL || 'https://educ.isen-mediterranee.fr',
  adminUserId: process.env.DISCORD_ADMIN_USER_ID,
  studentCategoryName: process.env.STUDENT_CATEGORY_NAME || 'Espaces élèves',
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  dbPath: process.env.DB_PATH || './database/isen.sqlite',
};

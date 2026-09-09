require('dotenv').config();

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID, // optionnel, pour un déploiement rapide en dev
  encryptionKey: process.env.ENCRYPTION_KEY, // 32 octets en hexadécimal
  entBaseUrl: 'https://ent.isen-mediterranee.fr',
  apiBaseUrl: process.env.ISEN_API_URL || 'http://localhost:8080',
  adminUserId: process.env.DISCORD_ADMIN_USER_ID,
  studentCategoryName: process.env.STUDENT_CATEGORY_NAME || 'Espaces élèves',
  timezone: process.env.TIMEZONE || 'Europe/Paris',
  dbPath: process.env.DB_PATH || './database/isen.sqlite',
};

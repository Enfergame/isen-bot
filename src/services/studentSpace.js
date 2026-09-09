const {
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { adminUserId, studentCategoryName } = require('../config');

function normalizeName(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildStudentNickname(isenUsername) {
  const parts = isenUsername.trim().split(/[.\s_-]+/).filter(Boolean);
  const firstName = parts[0] || isenUsername;
  const lastName = parts.slice(1).join('');
  const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  return `${formattedFirstName} ${lastName.charAt(0).toUpperCase()}.`.slice(0, 32);
}

function buildStudentChannelName(isenUsername) {
  return normalizeName(isenUsername).slice(0, 32) || 'espace-eleve';
}

async function ensureStudentChannel(guild, user, isenUsername) {
  const member = await guild.members.fetch(user.id);
  const category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === studentCategoryName
  ) || await guild.channels.create({ name: studentCategoryName, type: ChannelType.GuildCategory });

  const existing = guild.channels.cache.find(
    (channel) => channel.parentId === category.id && channel.topic === `isen-student:${user.id}`
  );
  if (existing) return existing;

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: guild.members.me || guild.client.user, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
  ];
  if (adminUserId) {
    const admin = await guild.members.fetch(adminUserId);
    overwrites.push({ id: admin, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }
  return guild.channels.create({
    name: buildStudentChannelName(isenUsername || user.username),
    type: ChannelType.GuildText,
    parent: category.id,
    topic: `isen-student:${user.id}`,
    permissionOverwrites: overwrites,
  });
}

async function setStudentNickname(member, isenUsername) {
  const nickname = buildStudentNickname(isenUsername);
  await member.setNickname(nickname, 'Connexion à l’espace élève');
  return nickname;
}

async function deleteStudentChannel(client, channelId, discordId) {
  if (!channelId) return false;
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || channel.topic !== `isen-student:${discordId}`) return false;
    await channel.delete('Suppression de l’espace élève');
    return true;
  } catch (error) {
    if (error.code !== 10003) {
      console.error(`Impossible de supprimer le salon de ${discordId}:`, error.message);
    }
    return false;
  }
}

module.exports = { ensureStudentChannel, setStudentNickname, deleteStudentChannel, buildStudentNickname, buildStudentChannelName };
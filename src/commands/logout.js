const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getCredentials, deleteCredentials } = require('../services/database');
const { deleteStudentChannel } = require('../services/studentSpace');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logout')
    .setDescription('Supprime tes identifiants ISEN enregistrés'),

  async execute(interaction) {
    const credentials = getCredentials(interaction.user.id);
    if (!credentials) {
      await interaction.reply({ content: "Tu n'as aucun compte ISEN enregistré.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (interaction.member && interaction.member.manageable) {
      try {
        await interaction.member.setNickname(credentials.original_nickname || null, 'Déconnexion de l’espace élève');
      } catch (error) {
        console.error(`Impossible de restaurer le pseudo de ${interaction.user.id}:`, error.message);
      }
    }
    const channelDeleted = await deleteStudentChannel(
      interaction.client,
      credentials.channel_id,
      interaction.user.id
    );
    deleteCredentials(interaction.user.id);
    await interaction.reply({
      content: channelDeleted
        ? '✅ Tes identifiants et ton espace élève ont été supprimés.'
        : '✅ Tes identifiants ont été supprimés. Le salon associé était déjà absent ou inaccessible.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
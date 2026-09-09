const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getCredentials } = require('../services/database');
const { fetchPlanning } = require('../services/planningService');
const { buildPlanningEmbed } = require('../utils/embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('planning')
    .setDescription('Affiche ton emploi du temps (visible uniquement par toi)'),

  async execute(interaction) {
    const creds = getCredentials(interaction.user.id);

    if (!creds) {
      await interaction.reply({
        content: "Tu n'as pas encore renseigné tes identifiants. Utilise `/login` d'abord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const events = await fetchPlanning(creds.isen_username);
      const embed = buildPlanningEmbed(events);
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur /planning :', error.message);
      await interaction.editReply(
        "Impossible de récupérer ton emploi du temps pour le moment. Réessaie plus tard."
      );
    }
  },
};

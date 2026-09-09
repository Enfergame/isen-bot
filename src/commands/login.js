const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const { getCredentials } = require('../services/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('login')
    .setDescription("Enregistre tes identifiants ISEN (uniquement visibles par toi)"),

  async execute(interaction) {
    if (getCredentials(interaction.user.id)) {
      await interaction.reply({
        content: "❌ Tu as déjà un compte enregistré. Utilise `/logout` avant de refaire une connexion.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('isen-login-modal')
      .setTitle('Connexion ISEN');

    const usernameInput = new TextInputBuilder()
      .setCustomId('isen-username')
      .setLabel('Identifiant (ex: prenom.nom)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const passwordInput = new TextInputBuilder()
      .setCustomId('isen-password')
      .setLabel('Mot de passe')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(usernameInput),
      new ActionRowBuilder().addComponents(passwordInput)
    );

    // Le formulaire s'affiche uniquement pour l'utilisateur qui a tapé /login.
    await interaction.showModal(modal);
  },
};

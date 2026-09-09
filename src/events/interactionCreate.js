const { testLogin } = require('../services/entAuth');
const {
  saveCredentials,
  getCredentials,
  setChannelId,
  setOriginalNickname,
} = require('../services/database');
const { encrypt } = require('../utils/encryption');
const { ensureStudentChannel, setStudentNickname } = require('../services/studentSpace');
const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    // --- Slash commands (/login, /planning, ...) ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const payload = { content: 'Une erreur est survenue.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload);
        } else {
          await interaction.reply(payload);
        }
      }
      return;
    }

    // --- Soumission du formulaire ouvert par /login ---
    if (interaction.isModalSubmit() && interaction.customId === 'isen-login-modal') {
      try {
      const username = interaction.fields.getTextInputValue('isen-username').trim();
      const password = interaction.fields.getTextInputValue('isen-password');

      // deferReply ephemeral => seule la personne qui a rempli le formulaire voit la suite
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (getCredentials(interaction.user.id)) {
        await interaction.editReply('❌ Tu as déjà un compte enregistré. Utilise `/logout` avant de refaire une connexion.');
        return;
      }

      const result = await testLogin(username, password);

      if (result.success) {
        const encryptedPassword = encrypt(password);
        if (!interaction.guild) {
          await interaction.editReply('❌ La connexion doit être effectuée depuis un serveur Discord.');
          return;
        }
        const channel = await ensureStudentChannel(interaction.guild, interaction.user, username);
        const originalNickname = interaction.member.nickname;
        await setStudentNickname(interaction.member, username);
        saveCredentials(interaction.user.id, username, encryptedPassword);
        setChannelId(interaction.user.id, channel.id);
        setOriginalNickname(interaction.user.id, originalNickname);
        await interaction.editReply(
          `✅ Connexion réussie. Ton espace privé est prêt : <#${channel.id}>`
        );
      } else {
        await interaction.editReply(
          "❌ Connexion échouée. Vérifie ton identifiant/mot de passe et retape `/login`."
        );
      }
      } catch (error) {
        console.error('Erreur pendant la création de l’espace élève :', error);
        const message = '❌ Impossible de créer ton espace élève. Vérifie que le bot dispose des permissions nécessaires.';
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply(message);
        } else {
          await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        }
      }
    }
  },
};

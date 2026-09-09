const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getCredentials } = require('../services/database');
const { testLogin } = require('../services/entAuth');
const { decrypt } = require('../utils/encryption');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Teste tes identifiants ISEN enregistrés'),

  async execute(interaction) {
    const credentials = getCredentials(interaction.user.id);

    if (!credentials) {
      await interaction.reply({
        content: "Tu n'as pas encore renseigné tes identifiants. Utilise `/login` d'abord.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const password = decrypt(credentials.isen_password_encrypted);
      const result = await testLogin(credentials.isen_username, password);

      await interaction.editReply(
        result.success
          ? '✅ La connexion avec tes identifiants ISEN enregistrés fonctionne.'
          : '❌ La connexion a échoué. Tes identifiants ISEN ne fonctionnent peut-être plus.'
      );
    } catch (error) {
      console.error(`Erreur /test pour ${interaction.user.id} :`, error.message);
      await interaction.editReply(
        "❌ Impossible de tester tes identifiants. Utilise `/login` après vérification de ta configuration."
      );
    }
  },
};

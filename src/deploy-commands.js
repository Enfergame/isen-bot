const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}

const rest = new REST().setToken(config.discordToken);

(async () => {
  try {
    console.log(`Déploiement de ${commands.length} commande(s)...`);

    if (config.guildId) {
      // Déploiement instantané sur un seul serveur (pratique en dev)
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
    } else {
      // Déploiement global (peut prendre jusqu'à 1h à se propager)
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    }

    console.log('Commandes déployées avec succès.');
  } catch (error) {
    console.error(error);
  }
})();

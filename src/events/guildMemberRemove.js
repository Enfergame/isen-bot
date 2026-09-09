const { getCredentials, deleteCredentials } = require('../services/database');
const { deleteStudentChannel } = require('../services/studentSpace');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const credentials = getCredentials(member.id);
    if (!credentials) return;

    await deleteStudentChannel(member.client, credentials.channel_id, member.id);
    deleteCredentials(member.id);
    console.log(`Compte et espace élève supprimés après le départ de ${member.user.tag}`);
  },
};
module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`Bot connecté en tant que ${client.user.tag}`);
    require('../services/scheduler').startScheduler(client);
  },
};

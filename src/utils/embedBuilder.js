const { EmbedBuilder } = require('discord.js');

function formatEvent(event) {
  const start = event.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const end = event.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const location = event.location ? ` | ${event.location}` : '';
  return `**${start}-${end}** ${event.summary || 'Cours'}${location}`;
}

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildDailyPlanningEmbed(events, date = new Date()) {
  const embed = new EmbedBuilder()
    .setTitle(`📅 Emploi du temps du ${date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`)
    .setColor(0x2b6cb0)
    .setTimestamp();
  const dailyEvents = events.filter((event) => dayKey(event.start) === dayKey(date));
  embed.setDescription(dailyEvents.length ? dailyEvents.map(formatEvent).join('\n') : 'Aucun cours prévu aujourd’hui.');
  return embed;
}

function buildPlanningEmbed(events, { referenceDate = new Date() } = {}) {
  const monday = new Date(referenceDate);
  monday.setHours(0, 0, 0, 0);
  const weekday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - weekday);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  const weekEvents = events.filter((event) => event.start >= monday && event.start < new Date(sunday.getTime() + 24 * 60 * 60 * 1000));
  const embed = new EmbedBuilder()
    .setTitle('📅 Emploi du temps - semaine')
    .setDescription(`${monday.toLocaleDateString('fr-FR')} - ${sunday.toLocaleDateString('fr-FR')}`)
    .setColor(0x2b6cb0)
    .setTimestamp();

  for (let index = 0; index < 7; index += 1) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dailyEvents = weekEvents.filter((event) => dayKey(event.start) === dayKey(date));
    embed.addFields({
      name: date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
      value: dailyEvents.length ? dailyEvents.map(formatEvent).join('\n') : '—',
      inline: false,
    });
  }

  return embed;
}

module.exports = { buildPlanningEmbed, buildDailyPlanningEmbed };

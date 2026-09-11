const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getCredentials, updateStudentState } = require('../services/database');
const { fetchStudentData } = require('../services/isenApi');
const { summarizeNotes, getNewNotes } = require('../services/notesService');

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildNotesEmbed(notes, newNotesCount = 0) {
  const embed = new EmbedBuilder()
    .setTitle('📚 Dernières notes')
    .setColor(0x5865f2);

  if (!notes.length) {
    embed.setDescription('📚 Aucune note disponible pour le moment.');
    return embed;
  }

  const displayed = notes.slice(0, 5);
  embed.setDescription(
    newNotesCount > 0 ? `🆕 ${newNotesCount} nouvelle(s) note(s)` : 'Tes dernières notes'
  );

  for (const note of displayed) {
    const gradeValue = note.grade ?? '—';
    const max = note.max_grade ?? '—';
    const coefficient = note.coefficient != null ? ` • Coef. ${note.coefficient}` : '';

    embed.addFields({
      name: `${note.subject || 'Matière'} — ${note.assessment || 'Évaluation'}`,
      value: `${gradeValue} / ${max}${coefficient}\n${note.date || 'Date inconnue'}`,
    });
  }

  if (notes.length > displayed.length) {
    embed.setFooter({ text: `Affichage des ${displayed.length} dernières notes sur ${notes.length}` });
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notes')
    .setDescription('Affiche tes dernières notes ISEN'),

  async execute(interaction) {
    const credentials = getCredentials(interaction.user.id);

    if (!credentials) {
      await interaction.reply({
        content: '❌ Ton compte n\'est pas encore connecté. Utilise d\'abord la commande de connexion.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const data = await fetchStudentData(credentials);
      const rawGrades = Array.isArray(data.grades) ? data.grades : [];
      const notes = summarizeNotes(rawGrades);
      const previous = summarizeNotes(parseJson(credentials.last_known_grades, []));
      const newNotes = getNewNotes(rawGrades, previous);

      updateStudentState(interaction.user.id, {
        last_known_grades: JSON.stringify(rawGrades),
      });

      if (!notes.length) {
        await interaction.editReply({ embeds: [buildNotesEmbed([])] });
        return;
      }

      await interaction.editReply({
        embeds: [buildNotesEmbed(notes, newNotes.length)],
      });
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        await interaction.editReply(
          '🔐 Ta session Moodle a expiré. Reconnecte ton compte puis réessaie.'
        );
        return;
      }

      if (status >= 500 || status === 503 || status === 429) {
        await interaction.editReply('⚠️ Moodle est actuellement inaccessible. Réessaie dans quelques instants.');
        return;
      }

      console.error(`Erreur /notes pour ${interaction.user.id}:`, error?.message || error);
      await interaction.editReply('❌ Une erreur est survenue lors de la récupération de tes notes.');
    }
  },
};

const axios = require('axios');
const ical = require('node-ical');
const { entBaseUrl } = require('../config');

/**
 * Récupère et parse le flux ICS de l'emploi du temps d'un utilisateur.
 * L'identifiant ISEN doit être au format prenom.nom (celui saisi via /login).
 */
async function fetchPlanning(isenUsername) {
  const url = `${entBaseUrl}/webaurion/ICS/${isenUsername}.ics`;
  const response = await axios.get(url, { responseType: 'text' });
  const events = ical.sync.parseICS(response.data);

  return Object.values(events)
    .filter((event) => event.type === 'VEVENT')
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

module.exports = { fetchPlanning };

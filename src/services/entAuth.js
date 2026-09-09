const axios = require('axios');
const { entBaseUrl } = require('../config');

/**
 * Teste des identifiants ISEN en tentant une vraie connexion sur l'ENT.
 *
 * IMPORTANT : la détection succès/échec ci-dessous est un POINT DE DÉPART.
 * Le comportement exact du serveur (code retourné, header de redirection,
 * contenu renvoyé en cas d'échec) doit être vérifié via les DevTools
 * (onglet Network, en se connectant manuellement) puis ajusté ici si besoin.
 * D'après le repo ISEN-API, le endpoint est /login et une connexion réussie
 * pose un cookie de session JSESSIONID.
 */
async function testLogin(username, password) {
  try {
    const response = await axios.post(
      `${entBaseUrl}/login`,
      new URLSearchParams({ username, password }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
      }
    );

    const setCookie = response.headers['set-cookie'] || [];
    const hasSession = setCookie.some((c) => c.includes('JSESSIONID'));
    const redirectsAwayFromLogin =
      response.status === 302 &&
      response.headers.location &&
      !response.headers.location.includes('/login');

    return { success: Boolean(hasSession && redirectsAwayFromLogin) };
  } catch (error) {
    // Un statut 3xx géré par validateStatus n'arrive pas ici ; ceci couvre
    // les vraies erreurs réseau ou un 4xx/5xx renvoyé par le serveur.
    return { success: false, error: error.message };
  }
}

module.exports = { testLogin };

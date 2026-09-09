# isen-bot

Bot Discord pour l'ENT ISEN Méditerranée (Toulon).

## Fonctionnalités

- `/login` : ouvre un formulaire (visible uniquement par toi) pour renseigner ton
  identifiant/mot de passe ISEN. Le bot teste la connexion sur l'ENT ; si elle
  réussit, tes identifiants sont chiffrés (AES-256-GCM) et enregistrés en base,
  liés à ton ID Discord. Si elle échoue, rien n'est enregistré.
- `/planning` : affiche la semaine civile en grille d'emploi du temps.
- Après `/login`, un salon privé est créé dans la catégorie `Espaces élèves`.
- Le salon reçoit le planning du jour à minuit, une alerte pour chaque nouvelle
  note et une alerte lorsque le compteur d'absences injustifiées augmente.
- `/logout` supprime les identifiants enregistrés et permet une nouvelle connexion.
- Le départ d'un membre du serveur supprime automatiquement son salon et ses
  identifiants de la base.

## Installation

```bash
npm install
cp .env.example .env
```

Remplis le `.env` :
- `DISCORD_TOKEN` et `DISCORD_CLIENT_ID` : depuis le Discord Developer Portal
- `DISCORD_GUILD_ID` : optionnel, pour déployer les commandes instantanément
  sur un seul serveur pendant le développement
- `ENCRYPTION_KEY` : génère-la avec
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `DISCORD_ADMIN_USER_ID` : ton identifiant Discord ; il sera autorisé dans les
  salons élèves avec l'élève et le bot.
- Active aussi l'intent privilégié **Server Members Intent** dans le Discord
  Developer Portal pour détecter les départs du serveur.
- `ISEN_API_URL` : laisse `http://localhost:8080` si l'API tourne avec Docker.

## Lancement

```bash
npm run deploy   # enregistre les slash commands auprès de Discord
npm start        # démarre le bot
```

## API ISEN auto-hébergée

Docker doit être installé. Depuis la racine du projet :

```bash
docker compose up -d isen-api
```

L'image officielle `ghcr.io/aydev-fr/isen-api:latest` écoute localement sur le
port `8080`. Le bot utilise `/v1/token`, `/v1/notations` et `/v1/absences`.
Les données de notes, d'absences et les tokens sont conservés localement et les
tokens sont chiffrés avec `ENCRYPTION_KEY`.

## Points à vérifier / ajuster

- `src/services/entAuth.js` : la détection succès/échec de connexion est une
  base de départ. Vérifie via les DevTools (onglet Network, connexion
  manuelle) le comportement exact du endpoint `/login` (code retourné,
  header `Location`, cookie posé) et ajuste la fonction en conséquence.
- Le flux ICS (`prenom.nom.ics`) semble accessible sans authentification
  (sécurité par obscurité côté ENT) : à confirmer, ça ne dépend pas du bot.
- Les mots de passe sont chiffrés at-rest, mais le bot possède la clé de
  déchiffrement (`ENCRYPTION_KEY`) : ce n'est donc pas un stockage "zero
  knowledge". Garde le `.env` et le fichier de base de données hors de tout
  dépôt public, et limite l'accès au serveur qui héberge le bot.

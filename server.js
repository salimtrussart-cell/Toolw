const express = require('express');
const app = express();
const crypto = require('crypto');
const path = require('path');

app.use(express.json());

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// ======================
// DONNÉES UTILISATEURS
// ======================
let users = {};        // stocke tous les utilisateurs
let bannedUsers = {};  // stocke les bannis

// ======================
// UTILITAIRES
// ======================

// Génère une clé aléatoire
function generateKey() {
    return crypto.randomBytes(4).toString('hex').toUpperCase() + Date.now().toString().slice(-4);
}

// Nettoyage des clés expirées toutes les heures
setInterval(() => {
    const now = Date.now();
    for (const user in users) {
        if (users[user].expires < now) {
            delete users[user];
        }
    }
}, 60 * 60 * 1000);

// ======================
// ROUTES API
// ======================

// Générer une clé pour un utilisateur
app.post('/generateKey', (req, res) => {
    const { username } = req.body;

    if (bannedUsers[username]) {
        return res.status(403).send({ error: 'Utilisateur banni' });
    }

    const key = generateKey();
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24h
    const isAdmin = username === "admin" || username === "20001210SB"; // clé admin

    users[username] = { key, expires, isAdmin };
    res.send({ username, key, expires, isAdmin });
});

// Vérifier une clé
app.get('/checkKey', (req, res) => {
    const { username, key } = req.query;

    if (users[username] && users[username].key === key) {
        return res.send({ valid: true, admin: users[username].isAdmin });
    }
    res.send({ valid: false });
});

// Liste des utilisateurs (admin uniquement)
app.get('/listUsers', (req, res) => {
    const { adminKey } = req.query;
    const adminUser = Object.values(users).find(u => u.key === adminKey && u.isAdmin);
    if (!adminUser) return res.status(403).send({ error: 'Admin requis' });

    res.send(users);
});

// Bannir un utilisateur (admin uniquement)
app.post('/banUser', (req, res) => {
    const { adminKey, usernameToBan } = req.body;
    const adminUser = Object.values(users).find(u => u.key === adminKey && u.isAdmin);
    if (!adminUser) return res.status(403).send({ error: 'Admin requis' });

    bannedUsers[usernameToBan] = true;
    delete users[usernameToBan];
    res.send({ success: true, banned: usernameToBan });
});

// Forcer une nouvelle clé pour un utilisateur (admin uniquement)
app.post('/forceNewKey', (req, res) => {
    const { adminKey, usernameToReset } = req.body;
    const adminUser = Object.values(users).find(u => u.key === adminKey && u.isAdmin);
    if (!adminUser) return res.status(403).send({ error: 'Admin requis' });

    if (!users[usernameToReset]) return res.status(404).send({ error: 'Utilisateur introuvable' });

    const newKey = generateKey();
    users[usernameToReset].key = newKey;
    users[usernameToReset].expires = Date.now() + 24 * 60 * 60 * 1000;
    res.send({ usernameToReset, newKey });
});

// ======================
// SERVEUR
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif sur le port ${PORT}`));

// Creates the collections with their $jsonSchema validator and the indexes of the document model (Deliverable 2, §2.2).
// Usage:  mongosh "<MONGODB_URI>/apuntado" --file docs/schemas/create-collections.mongodb.js
//
// `user_accounts` and `card_design_catalog` belong to the target model; the prototype backend
// still uses the Mongoose collections `users` and `card-designs`, so the names must not collide.
const fs = require('fs');
const path = require('path');
const base = typeof __dirname !== 'undefined' ? __dirname : 'docs/schemas';

const collections = ['matches', 'plays', 'user_accounts', 'token_ledger', 'top_up_requests', 'card_design_catalog', 'system_parameters', 'sessions'];
for (const name of collections) {
  const validator = JSON.parse(fs.readFileSync(path.join(base, `${name}.schema.json`), 'utf8'));
  if (db.getCollectionNames().includes(name)) {
    db.runCommand({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  print(`collection ready: ${name}`);
}

// matches — aggregate root (table + match + current round + scoreboard)
db.matches.createIndex({ invitationCode: 1 }, { unique: true });
db.matches.createIndex({ status: 1, 'settings.visibility': 1, createdAt: -1 });           // RF-09 public tables waiting for players
db.matches.createIndex({ 'players.userId': 1, status: 1 });                               // the user's active match
// plays — one bucket per (match, round)
db.plays.createIndex({ matchId: 1, roundNumber: 1 }, { unique: true });
// user accounts
db.user_accounts.createIndex({ username: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });
// token ledger — the unique reference guarantees idempotency (no double debit or double prize)
db.token_ledger.createIndex({ reference: 1 }, { unique: true });
db.token_ledger.createIndex({ userId: 1, createdAt: -1 });
// Nequi QR top-ups — a transfer reference is never accepted twice (RD-40)
db.top_up_requests.createIndex({ nequiReference: 1 }, { unique: true });
db.top_up_requests.createIndex({ status: 1, createdAt: 1 });                              // ADMIN inbox
db.top_up_requests.createIndex({ userId: 1, createdAt: -1 });
// catalog and parameters
db.card_design_catalog.createIndex({ name: 1 }, { unique: true });
db.card_design_catalog.createIndex({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });
db.system_parameters.createIndex({ version: -1 }, { unique: true });
// sessions — they expire on their own (TTL)
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ userId: 1 });
print('indexes created');

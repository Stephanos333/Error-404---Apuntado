// One-off migration to the English data contracts (matches, token_ledger, English field names
// and enum values). Old match aggregates are not migrated: they are deleted.
// Idempotent: it does nothing once the Spanish collections are gone and no game or user is left inconsistent.
// Usage: mongosh "<MONGODB_URI>" --file docker/mongo/migrate-english-contracts.js
const LEGACY_COLLECTIONS = ['partidas', 'asientos_tokens', 'jugadas', 'usuarios', 'solicitudes_recarga', 'disenos_carta', 'parametros_sistema', 'sesiones'];
const IN_PLAY = ['ACTIVE', 'SHOWING_MATCH_RESULTS'];

// 1. Games whose match lived in the deleted `partidas` collection can no longer be played:
//    finish them, close their seats and free their users (same effect as paying the pot).
const matchIds = new Set(db.getCollection('matches').find({}, { _id: 1 }).toArray().map((m) => m._id.toHexString()));
const orphans = db.getCollection('games').find({
  status: { $in: IN_PLAY },
  $or: [{ partidaId: { $exists: true } }, { matchId: { $exists: false } }, { matchId: { $nin: [...matchIds] } }],
}).toArray();
for (const game of orphans) {
  const players = db.getCollection('players').find({ gameId: game.gameId }, { userId: 1 }).toArray();
  db.getCollection('users').updateMany({ userId: { $in: players.map((p) => p.userId) }, status: 'PLAYING' }, { $set: { status: 'ACTIVE' } });
  db.getCollection('players').updateMany({ gameId: game.gameId }, { $set: { isActive: false } });
  db.getCollection('games').updateOne({ gameId: game.gameId }, { $set: { status: 'FINISHED' } });
}
print(`[migration] finished games without a match: ${orphans.length}`);

// 2. Users left as PLAYING without an active seat (their game no longer exists) are freed,
//    the same self-recovery the backend applies when they leave a room.
const seated = db.getCollection('players').distinct('userId', { isActive: true });
const freed = db.getCollection('users').updateMany({ status: 'PLAYING', userId: { $nin: seated } }, { $set: { status: 'ACTIVE' } });
print(`[migration] users freed without an active seat: ${freed.modifiedCount}`);

// 3. Remaining references to the old aggregate and the old plug-in id.
const unset = db.getCollection('games').updateMany({ partidaId: { $exists: true } }, { $unset: { partidaId: '' } });
const classic = db.getCollection('games').updateMany({ ruleId: 'clasica' }, { $set: { ruleId: 'classic' } });
print(`[migration] games cleaned: ${unset.modifiedCount}, games moved to the 'classic' plug-in: ${classic.modifiedCount}`);

// 4. Spanish collections of the document model (the English ones are created by create-collections).
const existing = db.getCollectionNames();
for (const name of LEGACY_COLLECTIONS.filter((c) => existing.includes(c))) {
  db.getCollection(name).drop();
  print(`[migration] dropped collection: ${name}`);
}

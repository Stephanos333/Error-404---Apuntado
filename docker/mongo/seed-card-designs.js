// Initial card design catalog (the backend's `card-designs` collection).
// Idempotent: only inserts the designs that do not exist yet (upsert by name with $setOnInsert).
// The names match the folders in frontend/public/assets/images/card/.
// Usage: mongosh "<MONGODB_URI>" --file docker/mongo/seed-card-designs.js
const designs = [
  { cardDesignId: '5f0c6c2e-0a8e-4b3e-9a51-2f1d3c4b5a60', name: 'DEFAULT', isDefault: true, isFree: true, isActive: true },
  { cardDesignId: '7a1d2e3f-4b5c-4d6e-8f70-81a2b3c4d5e6', name: 'BLUE', isDefault: false, isFree: true, isActive: true },
  { cardDesignId: '8b2e3f40-5c6d-4e7f-9a81-92b3c4d5e6f7', name: 'RED', isDefault: false, isFree: true, isActive: true },
  { cardDesignId: '9c3f4051-6d7e-4f80-8b92-a3c4d5e6f708', name: 'RETRO', isDefault: false, isFree: false, isActive: true, price: 50 },
  { cardDesignId: 'ad405162-7e8f-4091-9ca3-b4d5e6f70819', name: 'NIGHT_VISION', isDefault: false, isFree: false, isActive: true, price: 100 },
];

const now = new Date();
for (const design of designs) {
  const result = db.getCollection('card-designs').updateOne(
    { name: design.name },
    { $setOnInsert: { ...design, createdAt: now, updatedAt: now } },
    { upsert: true },
  );
  print(`design ${design.name}: ${result.upsertedCount === 1 ? 'created' : 'already existed'}`);
}

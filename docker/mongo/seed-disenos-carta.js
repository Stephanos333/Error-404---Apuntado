// Catálogo inicial de diseños de carta (colección `card-designs` del backend).
// Idempotente: solo inserta los diseños que no existen (upsert por nombre con $setOnInsert).
// Los nombres coinciden con las carpetas de frontend/public/assets/images/card/.
// Uso: mongosh "<MONGODB_URI>" --file docker/mongo/seed-disenos-carta.js
const disenos = [
  { cardDesignId: '5f0c6c2e-0a8e-4b3e-9a51-2f1d3c4b5a60', name: 'DEFAULT', isDefault: true, isFree: true, isActive: true },
  { cardDesignId: '7a1d2e3f-4b5c-4d6e-8f70-81a2b3c4d5e6', name: 'BLUE', isDefault: false, isFree: true, isActive: true },
  { cardDesignId: '8b2e3f40-5c6d-4e7f-9a81-92b3c4d5e6f7', name: 'RED', isDefault: false, isFree: true, isActive: true },
  { cardDesignId: '9c3f4051-6d7e-4f80-8b92-a3c4d5e6f708', name: 'RETRO', isDefault: false, isFree: false, isActive: true, price: 50 },
  { cardDesignId: 'ad405162-7e8f-4091-9ca3-b4d5e6f70819', name: 'NIGHT_VISION', isDefault: false, isFree: false, isActive: true, price: 100 },
];

const ahora = new Date();
for (const diseno of disenos) {
  const r = db.getCollection('card-designs').updateOne(
    { name: diseno.name },
    { $setOnInsert: { ...diseno, createdAt: ahora, updatedAt: ahora } },
    { upsert: true },
  );
  print(`diseño ${diseno.name}: ${r.upsertedCount === 1 ? 'creado' : 'ya existía'}`);
}

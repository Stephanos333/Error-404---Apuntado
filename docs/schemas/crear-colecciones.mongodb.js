// Crea las colecciones con su validador $jsonSchema y los índices del modelo documental (Entregable 2, §2.2).
// Uso:  mongosh "<MONGODB_URI>/apuntado" --file docs/schemas/crear-colecciones.mongodb.js
const fs = require('fs');
const path = require('path');
const base = typeof __dirname !== 'undefined' ? __dirname : 'docs/schemas';

const colecciones = ['partidas', 'jugadas', 'usuarios', 'asientos_tokens', 'solicitudes_recarga', 'disenos_carta', 'parametros_sistema', 'sesiones'];
for (const nombre of colecciones) {
  const validator = JSON.parse(fs.readFileSync(path.join(base, `${nombre}.schema.json`), 'utf8'));
  if (db.getCollectionNames().includes(nombre)) {
    db.runCommand({ collMod: nombre, validator, validationLevel: 'strict', validationAction: 'error' });
  } else {
    db.createCollection(nombre, { validator, validationLevel: 'strict', validationAction: 'error' });
  }
  print(`colección lista: ${nombre}`);
}

// partidas — agregado raíz (sala + partida + ronda actual + marcador)
db.partidas.createIndex({ codigoInvitacion: 1 }, { unique: true });
db.partidas.createIndex({ estado: 1, 'configuracion.visibilidad': 1, creadaEn: -1 });      // RF-09 salas públicas en espera
db.partidas.createIndex({ 'jugadores.usuarioId': 1, estado: 1 });                          // partida activa del usuario
// jugadas — un bucket por (partida, ronda)
db.jugadas.createIndex({ partidaId: 1, numeroRonda: 1 }, { unique: true });
// usuarios
db.usuarios.createIndex({ nombreUsuario: 1 }, { unique: true, collation: { locale: 'es', strength: 2 } });
// libro de tokens — la referencia única garantiza idempotencia (sin doble débito ni doble premio)
db.asientos_tokens.createIndex({ referencia: 1 }, { unique: true });
db.asientos_tokens.createIndex({ usuarioId: 1, en: -1 });
// recargas por QR Nequi — una referencia de transferencia no se acepta dos veces (RD-40)
db.solicitudes_recarga.createIndex({ referenciaNequi: 1 }, { unique: true });
db.solicitudes_recarga.createIndex({ estado: 1, creadaEn: 1 });                             // bandeja del ADMIN
db.solicitudes_recarga.createIndex({ usuarioId: 1, creadaEn: -1 });
// catálogo y parámetros
db.disenos_carta.createIndex({ nombre: 1 }, { unique: true });
db.disenos_carta.createIndex({ esPorDefecto: 1 }, { unique: true, partialFilterExpression: { esPorDefecto: true } });
db.parametros_sistema.createIndex({ version: -1 }, { unique: true });
// sesiones — expiran solas (TTL)
db.sesiones.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0 });
db.sesiones.createIndex({ usuarioId: 1 });
print('índices creados');

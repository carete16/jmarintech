const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'src', 'database', 'deals.db');
const db = new Database(dbPath);

console.log("Limpiando la base de datos...");
db.exec("DELETE FROM published_deals;");
// Intentar limpiar sqlite_sequence si existe para resetear IDs auto-incrementales
try {
    db.exec("DELETE FROM sqlite_sequence WHERE name='published_deals';");
} catch(e) {}
console.log("Historial de publicaciones eliminado correctamente.");
db.close();

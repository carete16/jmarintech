const { db } = require('./src/database/db');
const storesToKill = ['NordVPN', 'Disney+', 'IPVanish', 'AT&T Internet', 'Stack Social', 'WSJ', 'CIT Bank', 'Bitdefender', 'Surfshark', 'McAfee', 'Norton', 'Verizon Fios'];

console.log('--- DEPURACIÓN DE BASE DE DATOS ---');
for (let s of storesToKill) {
    const res = db.prepare('DELETE FROM published_deals WHERE tienda LIKE ?').run(`%${s}%`);
    if (res.changes > 0) {
        console.log(`❌ Eliminado ${s}: ${res.changes} ofertas.`);
    }
}

// También limpiar por título por si acaso
const keywords = ['bank', 'subscription', 'suscripción', 'antivirus', 'software', 'hosting'];
for (let kw of keywords) {
    const res = db.prepare('DELETE FROM published_deals WHERE title LIKE ?').run(`%${kw}%`);
    if (res.changes > 0) {
        console.log(`❌ Eliminado por palabra clave "${kw}": ${res.changes} ofertas.`);
    }
}

console.log('✅ Base de datos limpia.');
process.exit(0);

const Database = require("better-sqlite3");

const db = new Database("data/photobucket.db");
db.exec(`CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    originalName TEXT NOT NULL,
    metadata TEXT NOT NULL,
    uploadTimestamp INTEGER NOT NULL,
    captureTimestamp INTEGER NOT NULL
)`);

const insertStmt = db.prepare("INSERT INTO photos (id, originalName, metadata, uploadTimestamp, captureTimestamp) VALUES (:id, :originalName, :metadata, :uploadTimestamp, :captureTimestamp)");
const selectAllIdStmt = db.prepare("SELECT id FROM photos ORDER BY captureTimestamp");
const selectPhotoStmt = db.prepare("SELECT * FROM photos WHERE id = ?");

module.exports = {
    insertStmt,
    selectAllIdStmt,
    selectPhotoStmt
};
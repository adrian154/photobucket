const Database = require("better-sqlite3");

const db = new Database("data/photobucket.db");
db.exec(`CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    originalName TEXT NOT NULL,
    originalUrl TEXT NOT NULL,
    screenresUrl TEXT NOT NULL,
    thumbnailUrl TEXT NOT NULL,
    metadata TEXT NOT NULL,
    uploadTimestamp INTEGER NOT NULL
)`);

const insertStmt = db.prepare("INSERT INTO photos (id, originalName, originalUrl, screenresUrl, thumbnailUrl, metadata, uploadTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?)");
const selectStmt = db.prepare("SELECT * FROM photos");

module.exports = {
    insertStmt,
    selectStmt
};
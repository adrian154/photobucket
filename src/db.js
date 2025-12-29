const Database = require("better-sqlite3");

const db = new Database("data/photobucket.db");
db.exec(`CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    originalName TEXT NOT NULL,
    originalUrl TEXT NOT NULL,
    screenresUrl TEXT NOT NULL,
    thumbnailUrl TEXT NOT NULL,
    metadata TEXT NOT NULL,
    uploadTimestamp INTEGER NOT NULL
)`);

const insertStmt = db.prepare("INSERT INTO images (id, originalName, originalUrl, screenresUrl, thumbnailUrl, metadata, uploadTimestamp) VALUES (?, ?, ?, ?, ?, ?, ?)");

module.exports = {
    insertStmt
};
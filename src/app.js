const fs = require("fs");
const db = require("./db");
const path = require("path");
const busboy = require("busboy");
const express = require("express");
const processing = require("./processing");
const {tmpPath} = require("../config.json");
const sseHandler = require("./events").handler;

const app = express();

const generateId = () => {
    const alpha = "abcdefghijklmnopqrstuwvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const res = [];
    for(let i = 0; i < 12; i++) {
        res.push(alpha[Math.floor(Math.random() * alpha.length)]);
    }
    return res.join("");
};

app.get("/photos", (req, res) => {
    res.json(db.selectStmt.all());
});

app.post("/upload", (req, res) => {
    
    let id = null;

    const bb = busboy({headers: req.headers});
    bb.on("file", (name, file, info) => {
        id = generateId();
        const destPath = path.join(tmpPath, `${id}.${name}`);
        file.pipe(fs.createWriteStream(destPath));
        file.on("end", () => {
            processing.enqueue(name, id, destPath);
        });
    });

    bb.on("close", () => {
        res.status(200).json({id: id});
    });

    req.pipe(bb);
});

app.get("/processing-events", sseHandler);

app.use(express.static("static"));

app.listen(80, () => console.log("Listening!"));
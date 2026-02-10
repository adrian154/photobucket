const fs = require("fs");
const db = require("./db");
const path = require("path");
const busboy = require("busboy");
const express = require("express");
const processing = require("./processing");
const {tmpPath} = require("../config.json");
const {getUrlBase} = require("./backblaze");
const sseHandler = require("./events").handler;

const app = express();

app.get("/urlBase", (req, res) => {
    res.json(getUrlBase());
})

app.get("/photos", (req, res) => {
    res.json(db.selectAllStmt.all());
});

app.get("/photos/:id", (req, res) => {
    const photo = db.selectPhotoStmt.get(req.params.id);
    if(photo) {
        res.json(photo);
    } else {
        res.sendStatus(404);
    }
}); 

app.post("/upload", (req, res) => {

    const bb = busboy({headers: req.headers});
    bb.on("file", (name, file, info) => {
        const tmpName = `tmp${String(Math.random()).slice(2)}`;
        const destPath = path.join(tmpPath, tmpName);
        const writeStream = fs.createWriteStream(destPath);
        writeStream.on("finish", () => {
            processing.enqueue(info.filename, destPath, req.query.trackingTag || "dummy");
        });
        file.pipe(writeStream);
        
    });

    bb.on("close", () => {
        res.sendStatus(200);
    });

    req.pipe(bb);

});

app.get("/processing-events", sseHandler);

app.use(express.static("static"));

app.listen(80, () => console.log("Listening!"));
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

const generateId = () => {
    const alpha = "abcdefghijklmnopqrstuwvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const res = [];
    for(let i = 0; i < 8; i++) {
        res.push(alpha[Math.floor(Math.random() * alpha.length)]);
    }
    return res.join("");
};

app.get("/urlBase", (req, res) => {
    res.json(getUrlBase());
})

app.get("/photos", (req, res) => {
    res.json(db.selectAllIdStmt.all());
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
    
    let id = null;

    const bb = busboy({headers: req.headers});
    bb.on("file", (name, file, info) => {
        id = generateId();
        const destPath = path.join(tmpPath, `${id}-original`);
        file.pipe(fs.createWriteStream(destPath));
        file.on("end", () => {
            processing.enqueue(info.filename, id, destPath);
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
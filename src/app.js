const fs = require("fs");
const path = require("path");
const busboy = require("busboy");
const express = require("express");
const processing = require("./processing");
const {tmpPath} = require("../config.json");

const app = express();

const generateId = () => {
    const alpha = "abcdefghijklmnopqrstuwvxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const res = [];
    for(let i = 0; i < 12; i++) {
        res.push(alpha[Math.floor(Math.random() * alpha.length)]);
    }
    return res.join("");
};

app.use(express.static("static"));
app.post("/upload", (req, res) => {
    const bb = busboy({headers: req.headers});
    bb.on("file", (name, file, info) => {
        const id = generateId();
        const destPath = path.join(tmpPath, `${id}.${name}`);
        file.pipe(fs.createWriteStream(destPath));
        file.on("end", () => {
            console.log("enq");
            processing.enqueue(name, id, destPath);
        });
    });
    bb.on("close", () => {
        res.sendStatus(200);
    });
    req.pipe(bb);
});

app.listen(80, () => console.log("Listening!"));
// image processing pipeline
const fs = require("fs");
const db = require("./db");
const path = require("path");
const sharp = require("sharp");
const upload = require("./backblaze");
const {broadcast} = require("./events");
const {spawn} = require("child_process");
const {dcrawPath, tmpPath} = require("../config.json");
const exiftool = require("exiftool-vendored").exiftool;

const SCREENRES_SIZE = 1000;
const THUMBNAIL_SIZE = 300;

const queue = [];
let working = false;

const updateStatus = (task, status, fail) => {
    broadcast({id: task.id, status: status, fail: fail});
};

const processTask = async task => {

    updateStatus(task, "processing");

    const tiffPath = path.join(tmpPath, task.id + "-fullsize.tiff");
    const screenresPath = path.join(tmpPath, task.id + "-screenres.jpeg");
    const thumbnailPath = path.join(tmpPath, task.id + "-thumbnail.jpeg");
    
    const tiffStream = fs.createWriteStream(tiffPath);

    // convert raw file to TIFF
    // flags: -w = use camera white balance, -T = write TIFF, -h = combine 2x2 pixels instead of demosaicing, -c = write to stdout
    await new Promise((resolve, reject) => {
        const dcraw = spawn(dcrawPath, ["-w", "-T", "-h", "-c", task.path]);
        dcraw.stdout.pipe(tiffStream);
        dcraw.on("close", code => {
            if(code != 0) {
                tiffStream.close();
                reject(new Error(`image conversion failed (dcraw exited with code ${code})`));
            }
            resolve();
        });
    });

    // save downsized versions of image
    const image = sharp(tiffPath);
    const meta = await image.metadata();

    await image.clone().resize(meta.width >= meta.height ? SCREENRES_SIZE : null, meta.height >= meta.width ? SCREENRES_SIZE : null)
        .jpeg()
        .toFile(screenresPath);

    await image.clone().resize(meta.width >= meta.height ? THUMBNAIL_SIZE : null, meta.height >= meta.width ? THUMBNAIL_SIZE : null)
        .jpeg()
        .toFile(thumbnailPath);

    // read metadata
    const exifMetadata = await exiftool.read(task.path);

    // delete the TIFF intermediate
    fs.unlinkSync(tiffPath);

    updateStatus(task, "uploading");

    // finish processing
    await storeImage({
        id: task.id,
        originalName: task.originalName,
        originalPath: task.path,
        screenresPath: screenresPath,
        thumbnailPath: thumbnailPath,
        meta: exifMetadata
    });

    updateStatus(task, "done");

};

const storeImage = async (image) => {
    const originalUrl = await upload(image.originalPath, "application/octet-stream");
    const screenresUrl = await upload(image.screenresPath, "image/jpeg");
    const thumbnailUrl = await upload(image.thumbnailPath, "image/jpeg");
    fs.unlinkSync(image.originalPath);
    fs.unlinkSync(image.screenresPath);
    fs.unlinkSync(image.thumbnailPath);
    db.insertStmt.run(image.id, image.originalName, originalUrl, screenresUrl, thumbnailUrl, JSON.stringify(image.meta), Date.now());
};

const process = async (newTask) => {

    // add to queue
    queue.push(newTask);

    // if worker loop already active, don't start another
    if(working) {
        return;
    }

    // otherwise, begin draining queue
    working = true;
    while(queue.length > 0) {
        const todoTask = await queue.shift();
        try {
            await processTask(todoTask);
        } catch(err) {
            console.log(`error encountered while processing ${todoTask}:`);
            console.error(err);
            updateStatus(todoTask, "failed", true);
        }
    }

    // done!
    working = false;

};

module.exports = {
    queue: queue,
    enqueue: (originalName, id, path) => {
        process({
            originalName: originalName,
            id: id,
            path: path
        });
    }
};
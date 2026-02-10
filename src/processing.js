// image processing pipeline
const fs = require("fs");
const db = require("./db");
const path = require("path");
const sharp = require("sharp");
const crypto = require("crypto");
const {upload} = require("./backblaze");
const {broadcast} = require("./events");
const {spawn} = require("child_process");
const {dcrawPath, tmpPath} = require("../config.json");
const { createPipeline } = require("./work-queue");
const exiftool = require("exiftool-vendored").exiftool;

const SCREENRES_SIZE = 1600;
const THUMBNAIL_SIZE = 400;

const updateStatus = (trackingTag, status, fail) => {
    broadcast({trackingTag: trackingTag, status: status, fail: fail});
};

const computeCreateDate = (exif) => {
    const dateObj = exif.CreateDate;
    const offsetAbs = Math.abs(dateObj.tzoffsetMinutes);
    const pad = number => String(number).padStart(2, '0');
    return Date.parse(`${dateObj.year}-${pad(dateObj.month)}-${pad(dateObj.day)}T${pad(dateObj.hour)}:${pad(dateObj.minute)}:${pad(dateObj.second)}${dateObj.tzoffsetMinutes > 0 ? '+' : '-'}${pad(Math.floor(offsetAbs/60))}:${pad(offsetAbs%60)}`);
};

const computeId = (filePath) => new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const input = fs.createReadStream(filePath);
    input.on("readable", () => {
        const data = input.read();
        if(data) {
            hash.update(data);
        } else {
            resolve(hash.digest().toString("base64url").slice(0, 8));
        }
    })
});

const processTask = async task => {

    updateStatus(task.trackingTag, "processing");

    // compute MD5 hash of the original file
    const id = await computeId(task.path);
    if(db.selectPhotoStmt.get(id)) {
        updateStatus(task.trackingTag, "duplicate");
        fs.unlinkSync(task.path);
    }

    const tiffPath = path.join(tmpPath, id + "-fullsize.tiff");
    const screenresPath = path.join(tmpPath, id + "-screenres.jpeg");
    const thumbnailPath = path.join(tmpPath, id + "-thumbnail.jpeg");
    
    // convert raw file to TIFF
    // flags: -w = use camera white balance, -T = write TIFF, -h = combine 2x2 pixels instead of demosaicing, -c = write to stdout
    const tiffStream = fs.createWriteStream(tiffPath);
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

    await image.clone().resize(meta.width >= meta.height ? SCREENRES_SIZE : null, meta.height >= meta.width ? SCREENRES_SIZE : null, {fastShrinkOnLoad: false})
        .jpeg({quality: 100})
        .toFile(screenresPath);

    await image.clone().resize(meta.width >= meta.height ? THUMBNAIL_SIZE : null, meta.height >= meta.width ? THUMBNAIL_SIZE : null, {fastShrinkOnLoad: false})
        .jpeg({quality: 100})
        .toFile(thumbnailPath);

    // read metadata
    const exifMetadata = await exiftool.read(task.path);
    const captureDate = computeCreateDate(exifMetadata);
    
    // delete the TIFF intermediate
    fs.unlinkSync(tiffPath);

    updateStatus(task.trackingTag, "waiting");

    // send image to storage pipeline
    store({
        id: id,
        trackingTag: task.trackingTag,
        originalName: task.originalName,
        originalPath: task.path,
        screenresPath: screenresPath,
        thumbnailPath: thumbnailPath,
        meta: exifMetadata,
        captureTimestamp: captureDate
    });

};

const storeImage = async (image) => {
    
    updateStatus(image.trackingTag, "storing");

    // upload and delete files
    await upload(image.originalPath, "application/octet-stream");
    fs.unlinkSync(image.originalPath);
    await upload(image.screenresPath, "image/jpeg");
    fs.unlinkSync(image.screenresPath);
    await upload(image.thumbnailPath, "image/jpeg");
    fs.unlinkSync(image.thumbnailPath);

    db.insertStmt.run({
        id: image.id, 
        originalName: image.originalName, 
        metadata: JSON.stringify(image.meta),
        uploadTimestamp: Date.now(),
        captureTimestamp: image.captureTimestamp
    });
    
    updateStatus(image.trackingTag, "done");

};

const handleFail = (err, task) => {
    console.error(`error encountered while processing ${task.originalName}:`);
    console.error(err);
    fs.unlinkSync(task.path || task.originalPath);
    updateStatus(task.trackingTag, "failed", true);
}

const process = createPipeline(processTask, handleFail);
const store = createPipeline(storeImage, handleFail);

module.exports = {
    enqueue: (originalName, path, trackingTag) => {
        process({
            originalName: originalName,
            path: path,
            trackingTag: trackingTag
        });
    }
};
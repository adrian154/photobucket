const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {PassThrough} = require("stream");
const {keyId, key, bucketId, bucketName} = require("../config.json").backblaze;

let token = null;
let apiUrl = null;
let downloadUrl = null;

const uploadAttempts = 3;

// use PassThrough to compute SHA-1 hash of file as it's being uploaded
class UploadStream extends PassThrough {

    constructor(options) {
        super(options);
        this.hash = crypto.createHash("sha1");
    }
    
    _transform(chunk, encoding, callback) {
        this.hash.update(chunk);
        super._transform(chunk, encoding, callback);
    }

    _flush(callback) {
        this.push(this.hash.digest("hex"));
        callback();
    }

}

const getUploadUrl = async (isRetry) => {

    const req = await fetch(new URL(`/b2api/v4/b2_get_upload_url?bucketId=${encodeURIComponent(bucketId)}`, apiUrl), {
        headers: {"Authorization": token, "Content-Type": "application/json"}
    });

    const resp = await req.json();
    if(!req.ok) {

        // request might fail due to token expiry
        // if so, retry; we limit to 1 retry attempt.
        if((resp.code == "bad_auth_token" || resp.code == "expired_auth_token") && !isRetry) {
            await authorize();
            return getUploadUrl(true);
        }
       
        throw new Error(resp.code);
    }

    return resp;

};

const upload = async (filePath, contentType) => {

    const readStream = fs.createReadStream(filePath);
    const uploadStream = new UploadStream();
    readStream.pipe(uploadStream);
    
    const name = path.basename(filePath);

    for(let i = 0; i < uploadAttempts; i++) {

        const {uploadUrl, authorizationToken} = await getUploadUrl();
        try {

            const req = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    "Authorization": authorizationToken,
                    "X-Bz-File-Name": name,
                    "Content-Type": contentType,
                    "Content-Length": fs.statSync(filePath).size + 40,
                    "X-Bz-Content-Sha1": "hex_digits_at_end"
                },
                body: uploadStream,
                duplex: "half"
            });

            const resp = await req.json();
            if(!req.ok) {
                continue;
            }

            return String(new URL(`/file/${bucketName}/${encodeURIComponent(name)}`, downloadUrl));

        } catch(error) {
            console.error(error);
            continue;
        }

    }

    throw new Error("all attempts to upload file failed");

};

const authorize = async () => {

    const req = await fetch("https://api.backblazeb2.com/b2api/v4/b2_authorize_account", {
        headers: {
            "Authorization": "Basic " + Buffer.from(keyId + ":" + key).toString("base64")
        }
    });
    
    const resp = await req.json();
    if(!req.ok) throw new Error(resp.code);

    token = resp.authorizationToken;
    apiUrl = resp.apiInfo.storageApi.apiUrl;
    downloadUrl = resp.apiInfo.storageApi.downloadUrl;
    
};

authorize();

module.exports = upload;
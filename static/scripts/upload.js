const form = document.querySelector("form");
const submit = document.getElementById("submit");
const filePicker = document.getElementById("upload");
const progressList = document.getElementById("progress-list");

// listen for processing status events, and update display
const ongoingUploads = {};
const eventSource = new EventSource("/processing-events");
eventSource.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    handleStatusEvent(data);
});

// this function may be invoked by an incoming SSE event, or when an xhr error occurs locally
const handleStatusEvent = event => {
    const upload = ongoingUploads[event.trackingTag];
    if(upload) {
        
        upload.statusElem.textContent = event.status;

        // upload color based on status
        if(event.status == "done") {
            upload.statusElem.classList.add("status-success");
        } else if(event.fail) {
            upload.statusElem.classList.add("status-fail");
        }

        // if done or duplicate, no need to keep status indicator around
        if(event.status == "done" || event.status == "duplicate") {
            setTimeout(() => {
                upload.entryElem.remove();
            }, 1000);
        }

        // if failed, show retry button
        if(event.fail) {
            upload.retryElem.style.display = "";
        }

    }
};

form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit.disabled = true;
    ingestForm();
});

// keep queue of files to uplaod
const toUpload = [];
let uploading = false;

const enqueueUpload = async (upload) => {
    
    // add upload to queue
    toUpload.push(upload);

    // if already busy uploading, no need to do anything else
    if(uploading) {
        return;
    }

    // otherwise, begin draining queue
    uploading = true;
    window.onbeforeunload = () => true; // prompt before closure
    while(toUpload.length > 0) {
        const curUpload = toUpload.shift();
        try {
            await uploadFile(curUpload);
        } catch(error) {
            console.error(error);
        }
    }

    // done: return to normal state
    uploading = false;
    window.onbeforeunload = null;

};

const uploadFile = async (upload) => {

    const xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    xhr.open("POST", `/upload?trackingTag=${encodeURIComponent(upload.trackingTag)}`);

    await new Promise((resolve, reject) => {
        
        xhr.addEventListener("error", () => {
            handleStatusEvent({
                trackingTag: upload.trackingTag,
                status: "connection error", 
                fail: true
            });
            resolve();
        });

        xhr.upload.addEventListener("progress", (event) => {
            upload.progressElem.value = event.loaded / event.total;
            upload.statusElem.textContent = `uploading ${Math.round(event.loaded/event.total * 100)}%`;
        });

        xhr.addEventListener("readystatechange", (event) => {
            if(xhr.readyState == XMLHttpRequest.DONE) {
                if(xhr.status == 200) {
                    upload.statusElem.textContent = "waiting";
                    resolve();
                } else {
                    handleStatusEvent({
                        trackingTag: upload.trackingTag,
                        status: `error (${xhr.status})`,
                        fail: true
                    });
                    resolve();
                }
            }
        });

        const formData = new FormData();
        formData.append("file", upload.file);
        xhr.send(formData);
        
    });

};

const ingestForm = async () => {

    // set up each file for uploading
    for(const file of filePicker.files) {

        let upload = null;

        // generate unique tracking tag for each upload
        // server will identify update events with this tracking tag
        const trackingTag = "upload" + String(Math.random()).slice(2);

        // create progress tracking ui
        const progressEntry = document.createElement("div");
        progressEntry.classList.add("progress-entry");
        progressList.append(progressEntry);
       
        const entryFilename = document.createElement("span");
        entryFilename.classList = "entry-filename";
        entryFilename.textContent = file.name;
        progressEntry.append(entryFilename);

        const retryButton = document.createElement("button");
        retryButton.style.display = "none";
        retryButton.textContent = "retry...";
        retryButton.addEventListener("click", () => {
            retryButton.style.display = "";
            entryStatus.textContent = "";
            entryProgress.value = 0;
            enqueueUpload(upload);
        });
        progressEntry.append(" ", retryButton);        

        const entryStatus = document.createElement("span");
        entryStatus.classList = "entry-status";
        entryStatus.textContent = "";
        progressEntry.append(entryStatus);

        const entryProgress = document.createElement("progress");
        entryProgress.value = 0;
        progressEntry.append(entryProgress);

        upload = {
            file: file,
            statusElem: entryStatus,
            entryElem: progressEntry,
            progressElem: entryProgress,
            retryElem: retryButton,
            trackingTag: trackingTag
        };
        ongoingUploads[trackingTag] = upload;
        enqueueUpload(upload);

    }

    // reset & re-enable the form
    form.reset();
    submit.disabled = false;

}
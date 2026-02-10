const form = document.querySelector("form");
const submit = document.getElementById("submit");
const filePicker = document.getElementById("upload");
const progressList = document.getElementById("progress-list");

form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit.disabled = true;
    upload();
});

const upload = async () => {

    // establish event source
    const eventSource = new EventSource("/processing-events");
    
    const ongoingUploads = {};
    eventSource.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        const upload = ongoingUploads[data.trackingTag];
        if(upload) {
            upload.statusElem.textContent = data.status;
            if(data.status == "done") {
                upload.statusElem.classList.add("status-success");
                setTimeout(() => {
                    upload.entryElem.remove();
                }, 1000);
            } else if(data.fail) {
                upload.statusElem.classList.add("status-fail");
            }
        }
    });

    // create requests for each file
    const toUpload = [];
    for(const file of filePicker.files) {

        // generate unique tracking tag for each upload
        // server will identify update events with this tracking tag
        const trackingTag = "upload" + String(Math.random()).slice(2);

        const progressEntry = document.createElement("p");
        progressList.append(progressEntry);
        progressEntry.append(`${file.name}: `);

        const status = document.createElement("span");
        status.textContent = "upload pending";
        progressEntry.append(status);
        
        toUpload.push({file: file, statusElem: status, entryElem: progressEntry, trackingTag: trackingTag});

    }

    // reset & re-enable the form
    form.reset();
    submit.disabled = false;

    // start uploading
    for(const {statusElem, entryElem, file, trackingTag} of toUpload) {

        // associate tag with DOM elements
        ongoingUploads[trackingTag] = {
            statusElem: statusElem,
            entryElem: entryElem
        };

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.responseType = "json";
        xhr.open("POST", `/upload?trackingTag=${encodeURIComponent(trackingTag)}`);

        await new Promise((resolve, reject) => {
            xhr.addEventListener("error", () => {
                statusElem.textContent = `request failed`;
                statusElem.classList.add("status-fail");
                resolve();
            });
            xhr.upload.addEventListener("progress", (event) => {
                statusElem.textContent = `uploading ${Math.round(event.loaded/event.total * 100)}%`;
            });
            xhr.addEventListener("readystatechange", (event) => {
                if(xhr.readyState == XMLHttpRequest.DONE) {
                    if(xhr.status == 200) {
                        resolve();
                    } else {
                        statusElem.textContent = `error (${xhr.status} ${xhr.statusText})`;
                        statusElem.classList.add("status-fail");
                        resolve();
                    }
                }
            });
            xhr.send(formData);
        });

    }

}
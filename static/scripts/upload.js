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
    
    // keep track of complete uploads
    const completedUploads = {};

    eventSource.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        if(completedUploads[data.id]) {
            const statusElem = completedUploads[data.id].statusElem;
            statusElem.textContent = data.status;
            if(data.status == "done") {
                statusElem.classList.add("status-success");
                setTimeout(() => {
                    completedUploads[data.id].entryElem.remove();
                }, 1000);
            } else if(data.fail) {
                statusElem.classList.add("status-fail");
            }
        }
    });

    // create requests for each file
    const toUpload = [];
    for(const file of filePicker.files) {

        const progressEntry = document.createElement("p");
        progressList.append(progressEntry);
        progressEntry.append(`${file.name}: `);

        const status = document.createElement("span");
        status.textContent = "upload pending";
        progressEntry.append(status);
        
        toUpload.push({file: file, statusElem: status, entryElem: progressEntry});

    }

    // reset & re-enable the form
    form.reset();
    submit.disabled = false;

    // start uploading
    for(const {statusElem, entryElem, file} of toUpload) {

        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.responseType = "json";
        xhr.open("POST", "/upload");

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
                        completedUploads[xhr.response.id] = {statusElem, entryElem};
                        resolve();
                    } else {
                        status.textContent = `error (${xhr.status} ${xhr.statusText})`;
                    }
                }
            });
            xhr.send(formData);
        });

    }

}
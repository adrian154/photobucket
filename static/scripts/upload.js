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
    const statusIndicators = {};
    eventSource.addEventListener("message", (event) => {
        const data = JSON.parse(event.data);
        if(statusIndicators[data.id]) {
            const indicator = statusIndicators[data.id];
            indicator.textContent = data.status;
            if(data.status == "done") {
                indicator.classList.add("status-success");
            } else if(data.fail) {
                indicator.classList.add("status-fail");
            }
        }
    });

    // create requests for each file
    const toUpload = [];
    for(const file of filePicker.files) {

        const progressEntry = document.createElement("p");
        progressList.prepend(progressEntry);
        progressEntry.append(`${file.name}: `);
        const status = document.createElement("span");
        status.textContent = "pending";
        progressEntry.append(status);
        
        toUpload.push({file: file, statusIndicator: status});

    }

    // reset & re-enable the form
    form.reset();
    submit.disabled = false;

    // start uploading
    for(const {statusIndicator, file} of toUpload) {

        const formData = new FormData();
        formData.append("file", file);

        const req = new XMLHttpRequest();
        req.responseType = "json";
        req.open("POST", "/upload");
        req.send(formData);

        await new Promise((resolve, reject) => {
            req.addEventListener("error", () => {
                statusIndicator.textContent = `request failed`;
                statusIndicator.classList.add("status-fail");
                resolve();
            });
            req.addEventListener("progress", (event) => {
                statusIndicator.textContent = Math.round(event.loaded/event.total * 100) + "%";
            });
            req.addEventListener("readystatechange", (event) => {
                if(req.readyState == XMLHttpRequest.DONE) {
                    if(req.status == 200) {
                        statusIndicators[req.response.id] = statusIndicator;
                        resolve();
                    } else {
                        status.textContent = `error (${req.status} ${req.statusText})`;
                    }
                }
            });
        });

    }

}
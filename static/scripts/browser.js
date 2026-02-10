const photosArea = document.getElementById("photos");
const photoViewer = document.getElementById("photo-view");
const bigPhoto = document.getElementById("big-photo");

const loadPhotos = async () => {
    
    const urlBase = await (await fetch("/urlBase")).json();
    const resp = await fetch("/photos");
    const ids = await resp.json();

    for(const {id} of ids) {

        // compute urls
        const thumbnailUrl = new URL(id + "-thumbnail.jpeg", urlBase);
        const screenresUrl = new URL(id + "-screenres.jpeg", urlBase);
        const originalUrl = new URL(id + "-original", urlBase);

        const div = document.createElement("div");
        photosArea.append(div);
        div.classList.add("thumbnail");

        const img = document.createElement("img");
        div.append(img);
        img.loading = "lazy";
        img.src = thumbnailUrl;

        img.addEventListener("click", () => {
            photoViewer.classList.add("shown");
            bigPhoto.src = screenresUrl;
        });

    }

};

window.addEventListener("keydown", event => {
    if(event.key == "Escape") {
        photoViewer.classList.remove("shown");
    }
});

loadPhotos();
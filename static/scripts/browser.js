const photosArea = document.getElementById("photos");

const loadPhotos = async () => {
    
    const urlBase = await (await fetch("/urlBase")).json();
    const resp = await fetch("/photos");
    const ids = await resp.json();

    for(const {id} of ids) {
        const div = document.createElement("div");
        photosArea.append(div);
        div.classList.add("thumbnail");

        const img = document.createElement("img");
        div.append(img);
        img.loading = "lazy";
        img.src = new URL(id + "-thumbnail.jpeg", urlBase);
    }

};

loadPhotos();
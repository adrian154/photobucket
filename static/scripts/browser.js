const photoBrowser = document.getElementById("photo-browser");
const photoViewer = document.getElementById("photo-view");
const bigPhoto = document.getElementById("big-photo");
const nav = document.querySelector("nav");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const setupPhotoView = (photo) => {
    photoViewer.classList.add("shown");
    bigPhoto.src = photo.screenresUrl;
};

const loadPhotos = async () => {
    
    const urlBase = await (await fetch("/urlBase")).json();
    const resp = await fetch("/photos");
    const photos = await resp.json();

    let curDate = null, curMonth = null, curYear = null;
    let curPhotoGrid = null;
    let curMonthList = null;

    for(const photo of photos) {

        // for each month, create a new photogrid
        const captureDate = new Date(photo.captureTimestamp);
        const date = captureDate.getDate(), month = captureDate.getMonth(), year = captureDate.getFullYear();

        if(date != curDate || month != curMonth || year != curYear) {

            const header = document.createElement("h1");
            header.textContent = `${MONTHS[month]} ${date}, ${year}`;
            photoBrowser.append(header);

            const photogrid = document.createElement("div");
            photogrid.classList.add("photo-grid");
            photoBrowser.append(photogrid);
            
            curPhotoGrid = photogrid;

            // if we crossed into a new year, add year header tp nav
            if(year != curYear) {
             
                const p = document.createElement("p");
                p.textContent = year;
                nav.append(p);

                const list = document.createElement("ul");
                nav.append(list);
                curMonthList = list;

            }

            // if we crossed into a new month, add month jumplink to nav
            if(month != curMonth) {
                header.id = `gridheader_${month}_${year}`;
                const li = document.createElement("li");
                const a = document.createElement("a");
                a.href = '#' + header.id;
                a.textContent = MONTHS[captureDate.getMonth()];
                li.append(a);
                curMonthList.append(li);
            }

            curDate = date;
            curMonth = month;
            curYear = year;

        }

        // compute urls
        photo.thumbnailUrl = new URL(photo.id + "-thumbnail.jpeg", urlBase);
        photo.screenresUrl = new URL(photo.id + "-screenres.jpeg", urlBase);
        photo.originalUrl = new URL(photo.id + "-original", urlBase);

        // create thumbnail for grid
        const div = document.createElement("div");
        curPhotoGrid.append(div);
        div.classList.add("thumbnail");

        const img = document.createElement("img");
        div.append(img);
        img.loading = "lazy";
        img.src = photo.thumbnailUrl;

        // when thumbnail is clicked, setup photo view
        img.addEventListener("click", () => {
            setupPhotoView(photo);
        });

    }

};

// exit photo viewer when Esc pressed
window.addEventListener("keydown", event => {
    if(event.key == "Escape") {
        photoViewer.classList.remove("shown");
    }
});

photoViewer.addEventListener("click", event => {
    if(event.target == photoViewer) {
        photoViewer.classList.remove("shown");
    }
});

loadPhotos();
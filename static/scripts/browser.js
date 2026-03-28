const photoBrowser = document.getElementById("photo-browser");
const photoViewer = document.getElementById("photo-view");
const bigPhoto = document.getElementById("big-photo");
const nav = document.querySelector("nav");

// photo info elements
const infoTitle = document.getElementById("info-title");
const infoCaptureDate = document.getElementById("info-capture-date");
const infoOriginal = document.getElementById("info-original");
const infoScreenres = document.getElementById("info-screenres");
const infoThumbnail = document.getElementById("info-thumbnail");

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let shownPhoto = null;

const setupPhotoView = (photo) => {

    if(!photo) {
        return;
    }

    // first, remove old photo source
    bigPhoto.src = "";

    photoViewer.classList.add("shown");
    shownPhoto = photo;

    // load screenres photo
    bigPhoto.src = photo.screenresUrl;

    // populate info fields
    const date = new Date(photo.captureTimestamp);
    infoTitle.textContent = photo.originalName;
    infoCaptureDate.textContent = date.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });

    // downloads
    infoOriginal.href = `/photos/${photo.id}/original`;
    infoScreenres.href = photo.screenresUrl;
    infoThumbnail.href = photo.thumbnailUrl;

};

const loadPhotos = async () => {
    
    const urlBase = await (await fetch("/urlBase")).json();
    const resp = await fetch("/photos");
    const photos = await resp.json();

    document.title = `photobucket - ${photos.length} photos`;

    let curDate = null, curMonth = null, curYear = null;
    let curPhotoGrid = null;
    let curMonthList = null;

    for(let i = 0; i < photos.length; i++) {

        const photo = photos[i];
        photo.prev = photos[i - 1];
        photo.next = photos[i + 1];

        // for each month, create a new photogrid
        const captureDate = new Date(photo.captureTimestamp);
        const date = captureDate.getDate(), month = captureDate.getMonth(), year = captureDate.getFullYear();

        if(date != curDate || month != curMonth || year != curYear) {

            const headerA = document.createElement("a");
            const header = document.createElement("h1");
            const headerId = `${year}${MONTHS[month]}${date}`;
            header.id = headerId;
            header.textContent = `${MONTHS[month]} ${date}, ${year}`;
            headerA.append(header);
            headerA.href = `#${headerId}`;
            photoBrowser.append(headerA);

            const photogrid = document.createElement("div");
            photogrid.classList.add("photo-grid");
            photoBrowser.append(photogrid);
            
            curPhotoGrid = photogrid;

            // if we crossed into a new year, add year header to nav
            if(year != curYear) {
             
                const p = document.createElement("p");
                p.textContent = year;
                nav.append(p);

                const list = document.createElement("ul");
                nav.append(list);
                curMonthList = list;

            }

            // if we crossed into a new month, add new jumplink to nav
            if(month != curMonth) {
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

    // once photos are loaded, jump to appropriate section header
    const jumpToElem = document.getElementById(window.location.hash.slice(1));
    if(jumpToElem) {
        jumpToElem.scrollIntoView();
    }

};

// exit photo viewer when Esc pressed
window.addEventListener("keydown", event => {
    if(event.key == "Escape") {
        photoViewer.classList.remove("shown");
        shownPhoto = null;
    } else if(shownPhoto && event.key == "ArrowLeft") {
        setupPhotoView(shownPhoto.prev);
    } else if(shownPhoto && event.key == "ArrowRight") {
        setupPhotoView(shownPhoto.next);
    }
});

photoViewer.addEventListener("click", event => {
    if(event.target == photoViewer) {
        photoViewer.classList.remove("shown");
    }
});

loadPhotos();
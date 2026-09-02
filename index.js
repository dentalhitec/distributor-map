let map;
let markers       = [];
let placesListEl;
let detailsEl;
let searchBarEl;
let resultsLabelEl;

const ICONS = {
  backArrow: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

const PARTICLES = new Set([
  "de", "du", "des", "d", "la", "le", "les", "l",
  "sur", "sous", "lès", "lez", "en", "et", "au", "aux",
]);

function deshout(text, placeName = false) {
  const str = String(text ?? "");
  if (!str || /[a-z\u00E0-\u00FF]/.test(str)) return str;

  return str.toLowerCase().replace(/[^\s-]+/g, (word, offset) => {
    if (placeName && offset > 0 && PARTICLES.has(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}

const TICK_BANDS = [
  { max: 50,       width: 13 },
  { max: 200,      width: 10 },
  { max: 600,      width: 8  },
  { max: 2000,     width: 6  },
  { max: Infinity, width: 5  },
];

function tickWidth(distance) {
  if (distance === undefined) return 5;
  return TICK_BANDS.find(b => distance < b.max).width;
}

function loadGoogleMaps() {
  (g => {
    var h, a, k,
      p = "The Google Maps JavaScript API",
      c = "google", l = "importLibrary", q = "__ib__",
      m = document, b = window;
    b = b[c] || (b[c] = {});
    var d = b.maps || (b.maps = {}),
      r = new Set,
      e = new URLSearchParams,
      u = () => h || (h = new Promise(async (f, n) => {
        await (a = m.createElement("script"));
        e.set("libraries", [...r] + "");
        for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
        e.set("callback", c + ".maps." + q);
        a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
        d[q] = f;
        a.onerror = () => h = n(Error(p + " could not load."));
        a.nonce = m.querySelector("script[nonce]")?.nonce || "";
        m.head.append(a);
      }));
    d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n));
  })({
    key: "AIzaSyBcCHz0HxzjTRiB6PnOnIOFtKL7fteGWLE"
  });
  initMap();
}

async function initMap() {
  const { Map } = await google.maps.importLibrary("maps");
  const { Autocomplete } = await google.maps.importLibrary("places");

  map = new Map(document.getElementById("map"), {
    center:            { lat: 46.603354, lng: 2.394897792076994 },
    zoom:              6,
    mapId:             "f49b53da0964c209",
    zoomControl:       false,
    mapTypeControl:    false,
    scaleControl:      false,
    streetViewControl: false,
    rotateControl:     false,
    fullscreenControl: false,
  });

  placesListEl   = document.getElementById("places-list");
  detailsEl      = document.getElementById("place-details");
  searchBarEl    = document.getElementById("search-container");
  resultsLabelEl = document.getElementById("results-label");

  const searchInput = document.getElementById("place-search");
  const autocomplete = new Autocomplete(searchInput);
  autocomplete.bindTo("bounds", map);

  fetch("data.json")
    .then(r => r.json())
    .then(data => {
      data.forEach(place => addMarker(place));
      updatePlacesList(markers.map(({ place }) => ({ place })));
    })
    .catch(err => console.error("Erreur chargement JSON :", err));

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    map.panTo(place.geometry.location);
    map.setZoom(10);

    const from = place.name || (place.formatted_address || "").split(",")[0].trim();

    const sorted = sortMarkersByDistance(place.geometry.location);
    updatePlacesList(sorted, `triés depuis ${from}`);
  });
}

function addMarker(place) {
  const defaultIcon = {
    url: "marker.png",
    scaledSize: new google.maps.Size(26, 36),
    anchor:     new google.maps.Point(13, 36),
  };
  const selectedIcon = {
    ...defaultIcon,
    scaledSize: new google.maps.Size(36, 50),
    anchor:     new google.maps.Point(18, 50),
  };

  const marker = new google.maps.Marker({
    map,
    position:  { lat: place.latitude, lng: place.longitude },
    title:     place.Distributeur,
    animation: google.maps.Animation.DROP,
    icon:      defaultIcon,
  });

  markers.push({ marker, place });

  marker.addListener("click", () => {
    markers.forEach(({ marker: m }) => m.setIcon(defaultIcon));
    marker.setIcon(selectedIcon);
    highlightPlaceInSidebar(place);
    if (searchBarEl.style.display === "none") {
      showPlaceDetails(place);
    }
  });
}

function updatePlacesList(placesWithDistances, scope) {
  placesListEl.innerHTML = "";
  placesWithDistances.forEach(({ place, distance }, i) => {
    const item = createListItem(place, distance, i);
    placesListEl.appendChild(item);
  });
  setResultsBar(placesWithDistances.length, scope);
}

function createListItem(place, distance, index) {
  const li = document.createElement("li");
  li.classList.add("place-item");
  li.setAttribute("role", "listitem");
  li.setAttribute("tabindex", "0");
  li.setAttribute("aria-label", place.Distributeur);

  li.style.setProperty("--tick", `${tickWidth(distance)}px`);

  const dist = distance !== undefined
    ? `<span class="place-distance">${distance.toFixed(0)} km</span>`
    : "";

  const where = deshout(place.lieu || place.Adresse || "", true);

  li.innerHTML = `
    <span class="place-tick" aria-hidden="true" style="animation-delay:${Math.min(index, 14) * 0.025}s"></span>
    <div class="place-head">
      <span class="place-name">${esc(place.Distributeur)}</span>
      ${dist}
    </div>
    <div class="place-address">${esc(where) || "—"}</div>
    <div class="place-data">
      <span>${esc(place.zipcode || place.Zone || "")}</span>
    </div>
  `;

  li.onclick = () => {
    map.panTo({ lat: place.latitude, lng: place.longitude });
    map.setZoom(9);
    highlightPlaceInSidebar(place);
    showPlaceDetails(place);
  };

  li.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") li.onclick();
  };

  return li;
}

function showPlaceDetails(place) {
  const refs = place.Produit
    ? place.Produit.split(",").map(p => p.trim()).filter(Boolean)
        .map(p => `<div class="ref-item">${esc(p)}</div>`).join("")
    : null;

  const discovery = place["Journée découverte"]
    ? `<span class="badge-discovery">${esc(place["Journée découverte"])}</span>`
    : null;

  const phone = place["Téléphone"]
    ? `<a href="tel:${esc(place["Téléphone"].replace(/\s/g, ""))}">${esc(place["Téléphone"])}</a>`
    : null;

  const mail = place.mail
    ? `<a href="mailto:${esc(place.mail)}">${esc(place.mail)}</a>`
    : null;

  const siteUrl = place.site
    ? (/^https?:\/\//i.test(place.site) ? place.site : `https://${place.site}`)
    : null;
  const site = siteUrl
    ? `<a href="${esc(siteUrl)}" target="_blank" rel="noopener">${esc(place.site.replace(/^https?:\/\//i, "").replace(/\/$/, ""))}</a>`
    : null;

  const row = (key, value, isData) => value
    ? `<div class="spec-row">
        <div class="spec-key">${key}</div>
        <div class="spec-val${isData ? " is-data" : ""}">${value}</div>
      </div>`
    : "";

  const group = (title, rows) =>
    rows ? `<div class="spec-group-title">${title}</div>${rows}` : "";

  const address = [deshout(place.Adresse, true), place.zipcode, deshout(place.lieu, true)]
    .filter(Boolean).join(", ");

  detailsEl.innerHTML = `
    <!-- Plaque signalétique -->
    <div class="detail-plate">
      <div class="detail-plate-logo">
        <img src="${esc(place.logo || "logo.jpg")}" alt="" onerror="this.src='logo.jpg'" />
      </div>
      <h2 class="detail-title">${esc(place.Distributeur)}</h2>
      <p class="detail-address">${esc(address)}</p>
    </div>

    <!-- Tableau de spécifications -->
    <div class="detail-body">

      ${group("Contact",
        row("Responsable",  esc(deshout(place.Responsable))) +
        row("Gestionnaire", esc(deshout(place.Gestionnaire))) +
        row("Email",        mail) +
        row("Téléphone",    phone, true) +
        row("Site web",     site)
      )}

      ${group("Couverture",
        row("Zone",   esc(place.Zone), true) +
        row("Statut", discovery)
      )}

      ${group("Produits distribués", refs
        ? `<div class="spec-row is-block">
            <div class="spec-val"><div class="ref-list">${refs}</div></div>
          </div>`
        : ""
      )}

    </div>

    <div id="back-button" role="button" tabindex="0" aria-label="Retour à la liste">
      ${ICONS.backArrow}
      Retour à la liste
    </div>
  `;

  detailsEl.style.display   = "flex";
  placesListEl.style.display = "none";
  searchBarEl.style.display  = "none";
  resultsLabelEl.style.display = "none";

  const backBtn = document.getElementById("back-button");
  backBtn.onclick = goBackToList;
  backBtn.onkeydown = (e) => { if (e.key === "Enter") goBackToList(); };
}

function goBackToList() {
  detailsEl.style.display      = "none";
  placesListEl.style.display   = "block";
  searchBarEl.style.display    = "flex";
  resultsLabelEl.style.display = "flex";

  map.setCenter({ lat: 46.603354, lng: 1.888334 });
  map.setZoom(6);
}

function setResultsBar(count, scope) {
  const noun = count === 1 ? "distributeur" : "distributeurs";
  resultsLabelEl.innerHTML = `
    <span class="results-count">${count}</span>
    <span class="results-scope">${esc(scope ? `${noun}  ${scope}` : `${noun} `)}</span>
  `;
  resultsLabelEl.style.display = "flex";
}

function highlightPlaceInSidebar(place) {
  document.querySelectorAll(".place-item").forEach(el => el.classList.remove("highlight"));

  const items = Array.from(document.querySelectorAll(".place-item"));
  const match = items.find(el => el.querySelector(".place-name")?.textContent.includes(place.Distributeur));
  if (match) {
    match.classList.add("highlight");
    match.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function sortMarkersByDistance(location) {
  return markers
    .map(({ place }) => ({
      place,
      distance: calculateDistance(
        location.lat(), location.lng(),
        place.latitude, place.longitude
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

loadGoogleMaps();

/* ============================================================
   DENTALHITEC — Carte Distributeurs
   index.js — Logique principale
   ============================================================ */

let map;
let markers       = [];
let placesListEl;
let detailsEl;
let searchBarEl;
let resultsLabelEl;
let currentSearch = null; // résultat autocomplete actif

// ─── Icônes SVG inline ──────────────────────────────────────
const ICONS = {
  pin:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  mail:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>`,
  phone:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.23h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.04-.94a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  user:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  zone:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  box:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  calendar: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  arrow:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
  backArrow:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`,
};

// ─── Chargement Google Maps ──────────────────────────────────
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

// ─── Initialisation de la carte ──────────────────────────────
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

  // Chargement données
  fetch("data.json")
    .then(r => r.json())
    .then(data => {
      data.forEach(place => addMarker(place));
      updatePlacesList(markers.map(({ place }) => ({ place })));
    })
    .catch(err => console.error("Erreur chargement JSON :", err));

  // Autocomplete
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (!place.geometry) return;

    currentSearch = place;
    map.panTo(place.geometry.location);
    map.setZoom(10);

    const label = (place.formatted_address || "").replace(/\d+/g, "").trim();
    setResultsLabel(`Résultats proches de ${label}`);

    const sorted = sortMarkersByDistance(place.geometry.location);
    updatePlacesList(sorted);
  });
}

// ─── Ajout d'un marqueur ─────────────────────────────────────
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

// ─── Mise à jour de la liste ─────────────────────────────────
function updatePlacesList(placesWithDistances) {
  placesListEl.innerHTML = "";
  placesWithDistances.forEach(({ place, distance }, i) => {
    const item = createListItem(place, distance, i);
    placesListEl.appendChild(item);
  });
}

// ─── Création d'un élément liste ────────────────────────────
function createListItem(place, distance, index) {
  const li = document.createElement("li");
  li.classList.add("place-item");
  li.style.animationDelay = `${index * 0.03}s`;
  li.setAttribute("role", "listitem");
  li.setAttribute("tabindex", "0");
  li.setAttribute("aria-label", place.Distributeur);

  // Initiales pour avatar
  const initials = (place.Distributeur || "?")
    .split(" ")
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  const distanceBadge = distance !== undefined
    ? `<span class="place-distance">${distance.toFixed(1)} km</span>`
    : "";

  li.innerHTML = `
    <div class="place-avatar" aria-hidden="true">
      ${place.logo
        ? `<img src="${place.logo}" alt="${place.Distributeur}" loading="lazy" onerror="this.parentElement.textContent='${initials}'">`
        : initials}
    </div>
    <div class="place-info">
      <div class="place-name">${place.Distributeur}</div>
      <div class="place-address">${place.Adresse ? place.Adresse + ", " : ""}${place.zipcode || ""} ${place.lieu || ""}</div>
    </div>
    <div class="place-meta">
      ${distanceBadge}
      <span class="place-arrow" aria-hidden="true">${ICONS.arrow}</span>
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

// ─── Affichage du détail ─────────────────────────────────────
function showPlaceDetails(place) {
  // Produits en badges
  const products = place.Produit
    ? place.Produit.split(",").map(p =>
        `<span class="product-tag">${p.trim()}</span>`
      ).join("")
    : null;

  // Badge journée découverte
  const discovery = place["Journée découverte"]
    ? `<span class="badge-discovery">${place["Journée découverte"]}</span>`
    : "";

  // Téléphone
  const phone = place["Téléphone"]
    ? `<a href="tel:${place["Téléphone"].replace(/\s/g,"")}">${place["Téléphone"]}</a>`
    : "—";

  // Email
  const mail = place.mail
    ? `<a href="mailto:${place.mail}">${place.mail}</a>`
    : "—";

  detailsEl.innerHTML = `
    <!-- Hero bleu -->
    <div class="detail-hero">
      <div class="detail-logo-wrap">
        <img src="${place.logo || 'logo.jpg'}" alt="${place.Distributeur}" onerror="this.src='logo.jpg'" />
      </div>
      <div class="detail-title">${place.Distributeur}</div>
      <div class="detail-location">
        ${ICONS.pin}
        <span>${[place.Adresse, place.zipcode, place.lieu].filter(Boolean).join(", ")}</span>
      </div>
    </div>

    <!-- Corps -->
    <div class="detail-body">

      <div class="detail-section-title">Contacts</div>

      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.user}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Responsable</div>
          <div class="detail-row-value">${place.Responsable || "—"}</div>
        </div>
      </div>

      ${place.Gestionnaire ? `
      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.user}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Gestionnaire</div>
          <div class="detail-row-value">${place.Gestionnaire}</div>
        </div>
      </div>` : ""}

      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.mail}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Email</div>
          <div class="detail-row-value">${mail}</div>
        </div>
      </div>

      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.phone}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Téléphone</div>
          <div class="detail-row-value">${phone}</div>
        </div>
      </div>

      <div class="detail-section-title">Informations</div>

      ${place.Zone ? `
      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.zone}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Zone</div>
          <div class="detail-row-value">${place.Zone}</div>
        </div>
      </div>` : ""}

      ${products ? `
      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.box}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Produits</div>
          <div class="detail-row-value">
            <div class="product-tags">${products}</div>
          </div>
        </div>
      </div>` : ""}

      ${place["Journée découverte"] ? `
      <div class="detail-row">
        <div class="detail-row-icon">${ICONS.calendar}</div>
        <div class="detail-row-content">
          <div class="detail-row-label">Journée découverte</div>
          <div class="detail-row-value">${discovery}</div>
        </div>
      </div>` : ""}

    </div>

    <!-- Bouton retour -->
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

// ─── Retour à la liste ───────────────────────────────────────
function goBackToList() {
  detailsEl.style.display   = "none";
  placesListEl.style.display = "block";
  searchBarEl.style.display  = "flex";

  if (currentSearch) {
    resultsLabelEl.style.display = "block";
  }

  map.setCenter({ lat: 46.603354, lng: 1.888334 });
  map.setZoom(6);
}

// ─── Label résultats ─────────────────────────────────────────
function setResultsLabel(text) {
  resultsLabelEl.textContent = text;
  resultsLabelEl.style.display = "block";
}

// ─── Surlignage dans la sidebar ──────────────────────────────
function highlightPlaceInSidebar(place) {
  document.querySelectorAll(".place-item").forEach(el => el.classList.remove("highlight"));

  const items = Array.from(document.querySelectorAll(".place-item"));
  const match = items.find(el => el.querySelector(".place-name")?.textContent.includes(place.Distributeur));
  if (match) {
    match.classList.add("highlight");
    match.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

// ─── Tri par distance ────────────────────────────────────────
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

// ─── Calcul Haversine ────────────────────────────────────────
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

// ─── Démarrage ───────────────────────────────────────────────
loadGoogleMaps();
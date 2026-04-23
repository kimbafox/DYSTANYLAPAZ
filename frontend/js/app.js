const state = {
  filter: "todos",
  search: "",
  map: null,
  markers: new Map(),
  activeId: null,
  currentUser: null,
  users: [],
  properties: [],
  isPickingLocation: false,
  draftMarker: null,
};

const INDEX_LAYOUT_STORAGE_KEY = "dynapaz_index_layout";

const FALLBACK_PROPERTY_IMAGE = "./assets/houses/casa1_1.jpg";

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPropertyImages(property){
  const images = Array.isArray(property?.images)
    ? property.images.map((image) => String(image || "").trim()).filter(Boolean)
    : [];

  return images.length ? images : [FALLBACK_PROPERTY_IMAGE];
}

function moneyBOB(n){
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 0,
  }).format(n);
}

function roleLabel(role){
  if (role === "admin") return "Administrador";
  if (role === "vendedor") return "Vendedor";
  return "Usuario";
}

function rolePills(roles){
  return roles.map((role) => `<span class="rolePill">${roleLabel(role)}</span>`).join("");
}

function propertyPills(property){
  const labels = [];

  if (property.category === "alto") labels.push("Valor alto");
  if (property.category === "medio") labels.push("Valor medio");
  if (property.category === "economico") labels.push("Económica");
  labels.push(property.isNew ? "Nueva" : "Disponible");

  return labels.map((label) => `<span class="rolePill">${label}</span>`).join("");
}

function badgeText(property){
  if (property.isNew) return "Nueva";
  if (property.category === "alto") return "Valor alto";
  if (property.category === "medio") return "Valor medio";
  if (property.category === "economico") return "Económica";
  return "Propiedad";
}

function canManageProperties(){
  return tieneRol(state.currentUser, "admin") || tieneRol(state.currentUser, "vendedor");
}

function canDeleteProperty(property){
  return tieneRol(state.currentUser, "admin") || property.ownerId === state.currentUser?.id;
}

function profileMarkup(user, options = {}){
  return `
    <article class="profileCard">
      <div class="profileCard__top">
        <div>
          <h3 class="profileCard__title">${escapeHtml(user.nombre)} ${escapeHtml(user.apellido)}</h3>
          <p class="profileLine">${escapeHtml(user.correo)}</p>
        </div>
        <div class="profileRoles">${rolePills(user.roles)}</div>
      </div>

      <div class="profileGrid">
        <div class="profileLine"><strong>CI</strong>${escapeHtml(user.ci)}</div>
        <div class="profileLine"><strong>Teléfono</strong>${escapeHtml(user.telefono)}</div>
        <div class="profileLine"><strong>Dirección</strong>${escapeHtml(user.direccion)}</div>
        <div class="profileLine"><strong>Nacimiento</strong>${escapeHtml(user.fechaNacimiento)}</div>
      </div>

      ${options.canDelete ? `<div class="sessionCard__actions"><button class="dangerBtn" data-delete-user="${user.id}">Eliminar usuario</button></div>` : ""}
    </article>
  `;
}

function renderSessionSummary(){
  const container = document.getElementById("userSession");
  if (!container || !state.currentUser) return;

  container.innerHTML = `
    <p class="sessionCard__name">${escapeHtml(state.currentUser.nombre)} ${escapeHtml(state.currentUser.apellido)}</p>
    <p class="sessionCard__mail">${escapeHtml(state.currentUser.correo)}</p>
    <div class="profileRoles">${rolePills(state.currentUser.roles)}</div>
    <div class="sessionCard__actions">
      <button class="ghostBtn" onclick="window.location.href='./docs/usuario.html'">Ver mi perfil</button>
      <button class="ghostBtn" onclick="window.location.href='./docs/index.html'">Ver paneles</button>
      <button class="ghostBtn" onclick="logout()">Cerrar sesión</button>
    </div>
  `;
}

function setCatalogCollapsed(collapsed){
  const layout = document.querySelector(".layout");
  const toggleButton = document.getElementById("toggleListBtn");
  if (!layout || !toggleButton) return;

  layout.classList.toggle("layout--collapsed", collapsed);
  toggleButton.textContent = collapsed ? "Abrir lista" : "Ocultar lista";
  toggleButton.setAttribute("aria-expanded", String(!collapsed));
  localStorage.setItem(INDEX_LAYOUT_STORAGE_KEY, collapsed ? "collapsed" : "open");

  if (state.map) {
    window.setTimeout(() => state.map.invalidateSize(), 220);
  }
}

function initCatalogToggle(){
  const layout = document.querySelector(".layout");
  const toggleButton = document.getElementById("toggleListBtn");
  if (!layout || !toggleButton) return;

  const shouldCollapse = window.innerWidth > 950 && localStorage.getItem(INDEX_LAYOUT_STORAGE_KEY) === "collapsed";
  setCatalogCollapsed(shouldCollapse);

  toggleButton.addEventListener("click", () => {
    setCatalogCollapsed(!layout.classList.contains("layout--collapsed"));
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 950) {
      layout.classList.remove("layout--collapsed");
      toggleButton.setAttribute("aria-expanded", "true");
      return;
    }

    const persisted = localStorage.getItem(INDEX_LAYOUT_STORAGE_KEY) === "collapsed";
    layout.classList.toggle("layout--collapsed", persisted);
    toggleButton.textContent = persisted ? "Abrir lista" : "Ocultar lista";
    toggleButton.setAttribute("aria-expanded", String(!persisted));
    if (state.map) {
      window.setTimeout(() => state.map.invalidateSize(), 120);
    }
  });
}

function renderProfiles(){
  const profileContent = document.getElementById("profileContent");
  const profilesDirectory = document.getElementById("profilesDirectory");
  const profilesTitle = document.getElementById("profilesTitle");
  const profilesHint = document.getElementById("profilesHint");

  if (!profileContent || !profilesDirectory || !state.currentUser) return;

  profileContent.innerHTML = profileMarkup(state.currentUser);

  const isAdmin = tieneRol(state.currentUser, "admin");
  profilesTitle.textContent = isAdmin ? "Panel de administración" : "Perfiles registrados";
  profilesHint.textContent = isAdmin
    ? "El administrador puede revisar perfiles y eliminar cuentas."
    : "Listado de perfiles con datos personales registrados.";

  profilesDirectory.innerHTML = state.users
    .map((user) => profileMarkup(user, { canDelete: isAdmin && user.id !== state.currentUser.id }))
    .join("");

  if (!isAdmin) return;

  profilesDirectory.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.getAttribute("data-delete-user");
      if (!userId) return;

      const confirmed = window.confirm("Se eliminará este usuario y sus propiedades. ¿Deseas continuar?");
      if (!confirmed) return;

      try {
        await eliminarUsuario(userId);
        await loadDashboardData();
        alert("Usuario eliminado.");
      } catch (error) {
        alert(error.message || "No se pudo eliminar el usuario.");
      }
    });
  });
}

function renderPropertyManager(){
  const manager = document.getElementById("propertyManager");
  if (!manager || !state.currentUser) return;

  const manageableProperties = state.properties.filter((property) => canDeleteProperty(property));
  const listedProperties = canManageProperties() ? manageableProperties : state.properties;

  manager.innerHTML = `
    <div class="propertyManager__intro">
      <p class="portalPanel__hint">
        ${canManageProperties()
          ? "Publica inmuebles en el prototipo y administra las propiedades que te pertenecen."
          : "Solo vendedores y administradores pueden publicar propiedades."}
      </p>
    </div>

    ${canManageProperties() ? `
      <form id="propertyForm" class="propertyForm">
        <div class="authGrid">
          <input id="propertyTitle" type="text" placeholder="Título de la propiedad" required>
          <input id="propertyZone" type="text" placeholder="Zona" required>
          <select id="propertyCategory" class="propertySelect">
            <option value="alto">Valor alto</option>
            <option value="medio">Valor medio</option>
            <option value="economico">Valor económico</option>
          </select>
          <input id="propertyPrice" type="number" min="1" placeholder="Precio en bolivianos" required>
          <input id="propertyCoords" type="text" placeholder="Latitud, Longitud" readonly required>
          <input id="propertyImages" type="text" placeholder="Imagenes separadas por coma" required>
        </div>
        <div class="locationPickerRow">
          <button type="button" id="pickLocationBtn" class="cta">Seleccionar ubicación en el mapa</button>
          <button type="button" id="clearLocationBtn" class="ghostAction">Limpiar ubicación</button>
        </div>
        <p id="locationPickerStatus" class="helperText">Haz clic en el botón y luego selecciona el punto exacto de la casa en el mapa.</p>
        <textarea id="propertyDesc" placeholder="Descripción" required></textarea>
        <label class="roleOption">
          <input id="propertyIsNew" type="checkbox" checked>
          <span>Marcar como nueva</span>
        </label>
        <p id="propertyFeedback" class="feedback" hidden></p>
        <button type="submit">Publicar propiedad</button>
      </form>
    ` : `
      <div class="emptyState">Tu cuenta puede ver propiedades y perfiles, pero no publicar inmuebles.</div>
    `}

    <div class="managedProperties">
      <h3 class="subTitle">${canManageProperties() ? "Mis propiedades administrables" : "Propiedades visibles"}</h3>
      ${listedProperties.length
        ? listedProperties.map((property) => `
          <article class="profileCard">
            <div class="profileCard__top">
              <div>
                <h3 class="profileCard__title">${escapeHtml(property.title)}</h3>
                <p class="profileLine">${escapeHtml(property.zone)}</p>
              </div>
              <div class="profileRoles">${propertyPills(property)}</div>
            </div>
            <div class="profileGrid">
              <div class="profileLine"><strong>Precio</strong>${moneyBOB(property.priceBOB)}</div>
              <div class="profileLine"><strong>Publicado por</strong>${escapeHtml(property.ownerName)}</div>
            </div>
            ${canDeleteProperty(property) ? `<div class="sessionCard__actions"><button class="dangerBtn" data-delete-property="${property.id}">Eliminar propiedad</button></div>` : ""}
          </article>
        `).join("")
        : `<div class="emptyState">No tienes propiedades administrables todavía.</div>`}
    </div>
  `;

  const propertyForm = document.getElementById("propertyForm");
  if (propertyForm) {
    propertyForm.addEventListener("submit", handlePropertySubmit);
  }

  const pickLocationBtn = document.getElementById("pickLocationBtn");
  const clearLocationBtn = document.getElementById("clearLocationBtn");

  if (pickLocationBtn) {
    pickLocationBtn.addEventListener("click", () => {
      state.isPickingLocation = true;
      updateLocationPickerStatus("Haz clic en el mapa para fijar la ubicación exacta.", "pending");
      if (state.map) {
        state.map.getContainer().classList.add("map--picking");
      }
    });
  }

  if (clearLocationBtn) {
    clearLocationBtn.addEventListener("click", () => {
      clearDraftLocation();
    });
  }

  manager.querySelectorAll("[data-delete-property]").forEach((button) => {
    button.addEventListener("click", async () => {
      const propertyId = button.getAttribute("data-delete-property");
      if (!propertyId) return;

      const confirmed = window.confirm("Se eliminará esta propiedad del sistema. ¿Deseas continuar?");
      if (!confirmed) return;

      try {
        await deleteProperty(propertyId);
        await loadProperties();
        renderPropertyManager();
        renderCards();
      } catch (error) {
        alert(error.message || "No se pudo eliminar la propiedad.");
      }
    });
  });
}

function setPropertyFeedback(message, type = "error"){
  const feedback = document.getElementById("propertyFeedback");
  if (!feedback) return;

  feedback.hidden = !message;
  feedback.textContent = message;
  feedback.className = `feedback feedback--${type}`;
}

function updateLocationPickerStatus(message, tone = "neutral"){
  const status = document.getElementById("locationPickerStatus");
  if (!status) return;

  status.textContent = message;
  status.className = `helperText helperText--${tone}`;
}

function clearDraftLocation(){
  state.isPickingLocation = false;
  if (state.map) {
    state.map.getContainer().classList.remove("map--picking");
  }

  const coordsInput = document.getElementById("propertyCoords");
  if (coordsInput) {
    coordsInput.value = "";
  }

  if (state.draftMarker && state.map) {
    state.map.removeLayer(state.draftMarker);
  }
  state.draftMarker = null;
  updateLocationPickerStatus("Haz clic en el botón y luego selecciona el punto exacto de la casa en el mapa.", "neutral");
}

function setDraftLocation(coords){
  const coordsInput = document.getElementById("propertyCoords");
  if (coordsInput) {
    coordsInput.value = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
  }

  if (!state.map) return;

  if (!state.draftMarker) {
    state.draftMarker = L.marker(coords, { draggable: false }).addTo(state.map);
  } else {
    state.draftMarker.setLatLng(coords);
  }

  state.map.getContainer().classList.remove("map--picking");
  state.isPickingLocation = false;
  updateLocationPickerStatus("Ubicación seleccionada. Ya puedes publicar la casa o ajustar la zona manualmente.", "success");
}

async function handlePropertySubmit(event){
  event.preventDefault();

  const button = event.currentTarget.querySelector("button[type='submit']");
  const coords = String(document.getElementById("propertyCoords")?.value || "")
    .split(",")
    .map((value) => Number(value.trim()));

  const payload = {
    title: document.getElementById("propertyTitle")?.value || "",
    zone: document.getElementById("propertyZone")?.value || "",
    category: document.getElementById("propertyCategory")?.value || "",
    priceBOB: Number(document.getElementById("propertyPrice")?.value || 0),
    coords,
    images: String(document.getElementById("propertyImages")?.value || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    desc: document.getElementById("propertyDesc")?.value || "",
    isNew: Boolean(document.getElementById("propertyIsNew")?.checked),
  };

  button.disabled = true;
  setPropertyFeedback("");

  try {
    await createProperty(payload);
    event.currentTarget.reset();
    document.getElementById("propertyIsNew").checked = true;
    clearDraftLocation();
    setPropertyFeedback("Propiedad publicada correctamente.", "success");
    await loadProperties();
    renderPropertyManager();
    renderCards();
  } catch (error) {
    setPropertyFeedback(error.message || "No se pudo publicar la propiedad.");
  } finally {
    button.disabled = false;
  }
}

function passesFilter(property){
  if (state.filter === "todos") return true;
  if (state.filter === "nuevas") return property.isNew === true;
  return property.category === state.filter;
}

function passesSearch(property){
  const search = state.search.trim().toLowerCase();
  if (!search) return true;
  return `${property.title} ${property.zone} ${property.desc} ${property.ownerName}`
    .toLowerCase()
    .includes(search);
}

function getVisible(){
  return state.properties.filter((property) => passesFilter(property) && passesSearch(property));
}

function syncMarkers(){
  if (!state.map) return;

  state.markers.forEach((marker) => {
    state.map.removeLayer(marker);
  });
  state.markers.clear();

  state.properties.forEach((property) => {
    const marker = L.marker(property.coords).addTo(state.map);
    marker.bindPopup(
      `<b>${escapeHtml(property.title)}</b><br>${escapeHtml(property.zone)}<br><b>${moneyBOB(property.priceBOB)}</b><br>Publica: ${escapeHtml(property.ownerName)}`
    );

    marker.on("click", () => {
      focusOnProperty(property.id, { openPopup: true, scrollToCard: true });
    });

    state.markers.set(property.id, marker);
  });
}

function updateMarkers(visibleIds){
  const visibleSet = new Set(visibleIds);

  state.properties.forEach((property) => {
    const marker = state.markers.get(property.id);
    if (!marker) return;

    if (visibleIds.length === 0) {
      marker.setOpacity(1);
      return;
    }

    marker.setOpacity(visibleSet.has(property.id) ? 1 : 0.25);
  });
}

function focusOnProperty(id, opts = {}){
  const property = state.properties.find((item) => item.id === id);
  if (!property) return;

  state.activeId = id;

  const marker = state.markers.get(id);
  if (marker && state.map){
    state.map.setView(property.coords, 15, { animate: true, duration: 0.5 });
    if (opts.openPopup) marker.openPopup();
  }

  if (opts.scrollToCard){
    const cards = [...document.querySelectorAll(".card")];
    const idx = getVisible().findIndex((item) => item.id === id);
    if (idx >= 0 && cards[idx]){
      cards[idx].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

function renderCards(){
  const container = document.getElementById("cards");
  if (!container) return;

  container.innerHTML = "";

  const list = getVisible();
  if (list.length === 0){
    container.innerHTML = `<div class="emptyState">No hay resultados con esos filtros.</div>`;
    updateMarkers([]);
    return;
  }

  list.forEach((property, idx) => {
    const propertyImages = getPropertyImages(property);
    const card = document.createElement("article");
    card.className = "card";
    card.style.animationDelay = `${Math.min(idx * 60, 420)}ms`;

    card.innerHTML = `
      <div class="card__top">
        <img class="card__img" src="${escapeHtml(propertyImages[0])}" alt="${escapeHtml(property.title)}">
        <div class="badge">${badgeText(property)}</div>
        <div class="carouselControls">
          <button class="iconBtn" data-action="prev" aria-label="Anterior">‹</button>
          <button class="iconBtn" data-action="next" aria-label="Siguiente">›</button>
        </div>
      </div>

      <div class="card__body">
        <h3 class="card__title">${escapeHtml(property.title)}</h3>
        <div class="card__meta">
          <span>${escapeHtml(property.zone)}</span>
          <span>•</span>
          <span>${property.isNew ? "Publicación nueva" : "Disponible"}</span>
        </div>
        <div class="card__meta">
          <span>Publica:</span>
          <span>${escapeHtml(property.ownerName)}</span>
        </div>
        <div class="card__description">${escapeHtml(property.desc)}</div>
        <div class="priceRow">
          <div class="price">${moneyBOB(property.priceBOB)}</div>
          <button class="cta" data-action="focus">Ver en mapa</button>
        </div>
        ${canDeleteProperty(property) ? `<div class="sessionCard__actions"><button class="dangerBtn" data-action="delete">Eliminar</button></div>` : ""}
      </div>
    `;

    const img = card.querySelector(".card__img");
    let current = 0;
    const setImg = () => {
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = propertyImages[current];
        img.style.opacity = "1";
      }, 120);
    };

    card.querySelector('[data-action="prev"]').addEventListener("click", (event) => {
      event.stopPropagation();
      current = (current - 1 + propertyImages.length) % propertyImages.length;
      setImg();
    });

    card.querySelector('[data-action="next"]').addEventListener("click", (event) => {
      event.stopPropagation();
      current = (current + 1) % propertyImages.length;
      setImg();
    });

    card.querySelector('[data-action="focus"]').addEventListener("click", (event) => {
      event.stopPropagation();
      focusOnProperty(property.id);
    });

    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const confirmed = window.confirm("Se eliminará esta propiedad. ¿Deseas continuar?");
        if (!confirmed) return;

        try {
          await deleteProperty(property.id);
          await loadProperties();
          renderPropertyManager();
          renderCards();
        } catch (error) {
          alert(error.message || "No se pudo eliminar la propiedad.");
        }
      });
    }

    card.addEventListener("click", () => focusOnProperty(property.id));
    container.appendChild(card);
  });

  updateMarkers(list.map((property) => property.id));
}

function initFilters(){
  const chips = [...document.querySelectorAll(".chip")];
  if (!chips.length) return;

  chips.forEach((btn) => {
    btn.addEventListener("click", () => {
      chips.forEach((chip) => chip.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.filter = btn.dataset.filter;
      renderCards();
    });
  });
}

function initSearch(){
  const input = document.getElementById("searchInput");
  if (!input) return;

  input.addEventListener("input", () => {
    state.search = input.value;
    renderCards();
  });
}

function initMap(){
  const mapElement = document.getElementById("map");
  if (!mapElement || typeof L === "undefined") return;

  state.map = L.map("map", { zoomControl: true }).setView([-16.5, -68.15], 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);

  state.map.on("click", (event) => {
    if (!state.isPickingLocation) return;

    const coords = [event.latlng.lat, event.latlng.lng];
    setDraftLocation(coords);
  });
}

async function loadProperties(){
  state.properties = await getProperties();
  syncMarkers();
}

async function loadDashboardData(){
  const [users, properties] = await Promise.all([getUsers(), getProperties()]);
  state.users = users;
  state.properties = properties;
  syncMarkers();
  renderProfiles();
  renderPropertyManager();
  renderCards();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    state.currentUser = await requireAuth();
    if (!state.currentUser) return;

    renderSessionSummary();
    initCatalogToggle();
    initFilters();
    initSearch();
    initMap();
    await loadDashboardData();
  } catch (error) {
    alert(error.message || "No se pudo cargar el panel.");
  }
});
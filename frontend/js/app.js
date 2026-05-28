const state = {
  filter: "todos",
  search: "",
  map: null,
  markers: new Map(),
  activeId: null,
  currentUser: null,
  users: [],
  properties: [],
  notifications: [],
  isPickingLocation: false,
  draftMarker: null,
  draftCoords: null,
  selectedPropertyImages: [],
};

const INDEX_LAYOUT_STORAGE_KEY = "dynapaz_index_layout";

const FALLBACK_PROPERTY_IMAGE = "./assets/houses/casa1_1.jpg";
const LA_PAZ_BOUNDS = [
  [-16.6505, -68.255],
  [-16.426, -68.011],
];
const LA_PAZ_CENTER = [-16.4957, -68.1336];
const LA_PAZ_DEFAULT_ZOOM = 12;

function isWorkspaceDashboard(){
  return Boolean(document.querySelector(".docsDashboard--workspace"));
}

function getActiveWorkspaceSection(){
  return document.querySelector("[data-section-panel].is-active")?.getAttribute("data-section-panel") || "perfil";
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setAppFeedback(message, type = "error"){
  const feedback = document.getElementById("appFeedback");
  if (!feedback) return;

  feedback.hidden = !message;
  feedback.textContent = message;
  feedback.className = `feedback feedback--${type}`;
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
  labels.push(property.status === "vendida" ? "Vendida" : property.isNew ? "Nueva" : "Disponible");

  return labels.map((label) => `<span class="rolePill">${label}</span>`).join("");
}

function badgeText(property){
  if (property.status === "vendida") return "Vendida";
  if (property.isNew) return "Nueva";
  if (property.category === "alto") return "Valor alto";
  if (property.category === "medio") return "Valor medio";
  if (property.category === "economico") return "Económica";
  return "Propiedad";
}

function canManageProperties(){
  return tieneRol(state.currentUser, "admin") || tieneRol(state.currentUser, "vendedor") || tieneRol(state.currentUser, "usuario");
}

function canDeleteProperty(property){
  return tieneRol(state.currentUser, "admin") || property.ownerId === state.currentUser?.id;
}

function canExpressInterest(property){
  return Boolean(state.currentUser && property.ownerId !== state.currentUser.id && property.status !== "vendida");
}

function buildPropertyMessage(property){
  return `Hola, me interesa la propiedad "${property.title}" en ${property.zone}. ¿Podrías darme más información? Precio: ${moneyBOB(property.priceBOB)}.`;
}

function getPropertyContactLink(property){
  if (property.ownerWhatsappLink) return property.ownerWhatsappLink;

  if (property.ownerPhone) {
    const phone = String(property.ownerPhone).replace(/\D/g, "");
    return `https://wa.me/591${phone}?text=${encodeURIComponent(buildPropertyMessage(property))}`;
  }

  return "";
}

function openPropertyModal(property){
  const modal = document.getElementById("propertyModal");
  if (!modal) return;

  const propertyImages = getPropertyImages(property);
  let current = 0;

  const renderPreview = () => {
    const bullets = propertyImages
      .map((_, index) => `<button class="propertyModal__dot ${index === current ? "is-active" : ""}" type="button" data-slide="${index}" aria-label="Ir a la imagen ${index + 1}"></button>`)
      .join("");

    modal.innerHTML = `
      <div class="propertyModal__backdrop" data-close-modal="true"></div>
      <article class="propertyModal__sheet" role="dialog" aria-modal="true" aria-label="Detalle de la propiedad">
        <button class="propertyModal__close" type="button" data-close-modal="true" aria-label="Cerrar vista de propiedad">×</button>
        <div class="propertyModal__media">
          <img class="propertyModal__image" src="${escapeHtml(propertyImages[current])}" alt="${escapeHtml(property.title)}" loading="eager">
          <div class="propertyModal__controls">
            <button class="iconBtn" type="button" data-action="prev-image" aria-label="Imagen anterior">‹</button>
            <button class="iconBtn" type="button" data-action="next-image" aria-label="Imagen siguiente">›</button>
          </div>
          <div class="propertyModal__dots">${bullets}</div>
        </div>
        <div class="propertyModal__content">
          <p class="badge">${badgeText(property)}</p>
          <h3 class="card__title">${escapeHtml(property.title)}</h3>
          <p class="card__meta">${escapeHtml(property.zone)} • ${escapeHtml(property.ownerName)}</p>
          <p class="price">${moneyBOB(property.priceBOB)}</p>
          <p class="card__description">${escapeHtml(property.desc || "Sin descripción disponible.")}</p>
          <div class="sellerPanel">
            <div class="sellerPanel__head"><strong>${escapeHtml(property.ownerSummary?.nombreCompleto || property.ownerName)}</strong><span>${escapeHtml(property.ownerPhone || "Sin teléfono")}</span></div>
            <div class="sellerPanel__stats"><span>${Number(property.ownerSummary?.publishedCount || 0)} publicadas</span><span>${Number(property.ownerSummary?.soldCount || 0)} vendidas</span></div>
          </div>
          <div class="cardActions">
            ${canExpressInterest(property) ? `<button class="cta" type="button" data-action="interest-modal">Me interesa</button>` : ""}
            ${getPropertyContactLink(property) ? `<a class="ghostAction" href="${getPropertyContactLink(property)}" target="_blank" rel="noreferrer">Enviar mensaje</a>` : ""}
          </div>
        </div>
      </article>
    `;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");

    modal.querySelector("[data-action='prev-image']")?.addEventListener("click", () => {
      current = (current - 1 + propertyImages.length) % propertyImages.length;
      renderPreview();
    });

    modal.querySelector("[data-action='next-image']")?.addEventListener("click", () => {
      current = (current + 1) % propertyImages.length;
      renderPreview();
    });

    modal.querySelectorAll("[data-slide]").forEach((dot) => {
      dot.addEventListener("click", () => {
        current = Number(dot.dataset.slide || 0);
        renderPreview();
      });
    });

    modal.querySelectorAll("[data-close-modal]").forEach((control) => {
      control.addEventListener("click", closePropertyModal);
    });

    modal.querySelector("[data-action='interest-modal']")?.addEventListener("click", async () => {
      const button = modal.querySelector("[data-action='interest-modal']");
      if (!button || !canExpressInterest(property)) return;

      button.disabled = true;
      try {
        await registerInterest(property.id);
        setAppFeedback(`Tu interés fue enviado al propietario de ${property.title}.`, "success");
        button.textContent = "Interés enviado";
        window.setTimeout(closePropertyModal, 900);
      } catch (error) {
        setAppFeedback(error.message || "No se pudo registrar tu interés.");
      } finally {
        button.disabled = false;
      }
    });
  };

  renderPreview();
}

function closePropertyModal(){
  const modal = document.getElementById("propertyModal");
  if (!modal) return;

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = "";
}

function inferPropertyCategory(priceBOB){
  const amount = Number(priceBOB) || 0;
  if (amount >= 1200000) return "alto";
  if (amount >= 550000) return "medio";
  return "economico";
}

function getUserPropertySummary(userId){
  const ownedProperties = state.properties.filter((property) => property.ownerId === userId);
  const soldProperties = ownedProperties.filter((property) => property.status === "vendida");

  return {
    publishedCount: ownedProperties.length,
    soldCount: soldProperties.length,
    soldProperties,
  };
}

function buildWhatsappLabel(user){
  if (!user?.telefono) return "Sin WhatsApp";
  return `WhatsApp ${user.telefono}`;
}

function buildProfileActions(user){
  const summary = getUserPropertySummary(user.id);
  const soldMarkup = summary.soldProperties.length
    ? `
      <div class="soldProperties">
        ${summary.soldProperties.slice(0, 3).map((property) => `<span class="soldPropertyChip">${escapeHtml(property.title)}</span>`).join("")}
      </div>
    `
    : '<p class="profileHint">Todavía no registra casas vendidas.</p>';

  const whatsappLink = user.telefono
    ? `https://wa.me/591${String(user.telefono).replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${user.nombre}, vi tu perfil en DYNApaz 87 y quiero hablar sobre tus propiedades.`)}`
    : "";

  return {
    summaryMarkup: `
      <div class="profileStats">
        <div class="profileStat"><strong>${summary.publishedCount}</strong><span>Publicadas</span></div>
        <div class="profileStat"><strong>${summary.soldCount}</strong><span>Vendidas</span></div>
      </div>
      ${soldMarkup}
    `,
    contactMarkup: `
      <div class="sessionCard__actions profileActionsRow">
        ${whatsappLink ? `<a class="ghostAction" href="${whatsappLink}" target="_blank" rel="noreferrer">${escapeHtml(buildWhatsappLabel(user))}</a>` : `<span class="ghostAction ghostAction--disabled">Sin WhatsApp</span>`}
        ${user.telefono ? `<a class="ghostAction" href="tel:${escapeHtml(String(user.telefono).replace(/\s+/g, ""))}">Llamar</a>` : `<span class="ghostAction ghostAction--disabled">Sin teléfono</span>`}
      </div>
    `,
  };
}

function formatDateTime(value){
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function profileMarkup(user, options = {}){
  const profileActions = buildProfileActions(user);
  const initials = `${String(user.nombre || "").charAt(0)}${String(user.apellido || "").charAt(0)}`.toUpperCase();

  return `
    <article class="profileCard profileCard--enhanced">
      <div class="profileCard__top">
        <div class="profileAvatar" aria-hidden="true">${escapeHtml(initials)}</div>
        <div class="profileCard__headInfo">
          <h3 class="profileCard__title">${escapeHtml(user.nombre)} ${escapeHtml(user.apellido)}</h3>
          <p class="profileLine profileLine--muted">${escapeHtml(user.correo)}</p>
          <div class="profileRoles">${rolePills(user.roles)}</div>
        </div>
        <div class="profileCard__actions">
          ${state.currentUser && state.currentUser.id === user.id
            ? `<button class="cta" onclick="window.alert('Editar perfil - pendiente')">Editar perfil</button>`
            : `<button class="cta" data-view-user="${user.id}">Ver perfil</button>`}
          ${options.canDelete ? `<button class="dangerBtn" data-delete-user="${user.id}">Eliminar</button>` : ``}
        </div>
      </div>

      <div class="profileGrid profileGrid--compact">
        <div class="profileLine"><strong>CI</strong>${escapeHtml(user.ci)}</div>
        <div class="profileLine"><strong>Teléfono</strong>${escapeHtml(user.telefono)}</div>
        <div class="profileLine"><strong>Dirección</strong>${escapeHtml(user.direccion)}</div>
        <div class="profileLine"><strong>Nacimiento</strong>${escapeHtml(user.fechaNacimiento)}</div>
      </div>

      <div class="profileSummaryRow">
        ${profileActions.summaryMarkup}
        ${profileActions.contactMarkup}
      </div>
    </article>
  `;
}

function renderSessionSummary(){
  const container = document.getElementById("userSession");
  if (!container || !state.currentUser) return;

  const interestCount = state.notifications.length;

  if (container.classList.contains("navUser")) {
    const roleText = state.currentUser.roles.map(roleLabel).join(", ");
    container.innerHTML = `
      <div class="navUser__info">
        <p class="navUser__name">${escapeHtml(state.currentUser.nombre)} ${escapeHtml(state.currentUser.apellido)}</p>
        <p class="navUser__role">${escapeHtml(roleText)}${interestCount ? ` &nbsp;·&nbsp; ${interestCount} interesados` : ""}</p>
      </div>
      <div class="navUser__actions">
        <button class="navBtn" onclick="window.location.href='./docs/usuario.html'">Mi perfil</button>
        <button class="navBtn navBtn--danger" onclick="logout()">Salir</button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <p class="sessionCard__name">${escapeHtml(state.currentUser.nombre)} ${escapeHtml(state.currentUser.apellido)}</p>
    <p class="sessionCard__mail">${escapeHtml(state.currentUser.correo)}</p>
    <div class="profileRoles">
      ${rolePills(state.currentUser.roles)}
      <span class="rolePill rolePill--accent">${interestCount} interesados</span>
    </div>
    <div class="sessionCard__actions">
      <button class="ghostBtn" onclick="window.location.href='./docs/usuario.html'">Ver mi perfil</button>
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
        <img class="card__img" src="${escapeHtml(propertyImages[0])}" alt="${escapeHtml(property.title)}" loading="lazy" decoding="async">
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
          <span>${property.status === "vendida" ? "Casa vendida" : property.isNew ? "Publicación nueva" : "Disponible"}</span>
        </div>
        <div class="card__meta">
          <span>Publica:</span>
          <span>${escapeHtml(property.ownerName)}</span>
        </div>
        <div class="sellerPanel">
          <div class="sellerPanel__head">
            <strong>${escapeHtml(property.ownerSummary?.nombreCompleto || property.ownerName)}</strong>
            <span>${escapeHtml(property.ownerPhone || "Sin teléfono")}</span>
          </div>
          <div class="sellerPanel__stats">
            <span>${Number(property.ownerSummary?.publishedCount || 0)} publicadas</span>
            <span>${Number(property.ownerSummary?.soldCount || 0)} vendidas</span>
          </div>
          <div class="cardActions">
            ${property.ownerWhatsappLink ? `<a class="ghostAction" href="${property.ownerWhatsappLink}" target="_blank" rel="noreferrer">Contactar por WhatsApp</a>` : ""}
            ${property.ownerPhone ? `<a class="ghostAction" href="tel:${escapeHtml(String(property.ownerPhone).replace(/\s+/g, ""))}">Llamar</a>` : ""}
            <button class="ghostAction" type="button" data-action="details">Ver detalles</button>
          </div>
          ${(property.ownerSummary?.soldProperties || []).length ? `
            <div class="soldProperties soldProperties--compact">
              ${(property.ownerSummary.soldProperties || []).slice(0, 2).map((soldProperty) => `<span class="soldPropertyChip">${escapeHtml(soldProperty.title)}</span>`).join("")}
            </div>
          ` : ""}
        </div>
        <div class="card__description">${escapeHtml(property.desc)}</div>
        <div class="priceRow">
          <div class="price">${moneyBOB(property.priceBOB)}</div>
          <div class="cardActions">
            ${canExpressInterest(property) ? '<button class="cta" data-action="interest">Me interesa</button>' : ""}
            <button class="ghostAction" type="button" data-action="details">Ver detalles</button>
          </div>
        </div>
        ${property.status === "vendida" ? '<div class="emptyState">Esta casa ya fue vendida. Usa WhatsApp o teléfono para consultar otras opciones del mismo vendedor.</div>' : ""}
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

    card.querySelectorAll('[data-action="details"]').forEach((detailsBtn) => {
      detailsBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openPropertyModal(property);
      });
    });

    const interestBtn = card.querySelector('[data-action="interest"]');
    if (interestBtn) {
      interestBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        interestBtn.disabled = true;

        try {
          await registerInterest(property.id);
          setAppFeedback(`Tu interés fue enviado al propietario de ${property.title}.`, "success");
        } catch (error) {
          setAppFeedback(error.message || "No se pudo registrar tu interés.");
        } finally {
          interestBtn.disabled = false;
        }
      });
    }

    const deleteBtn = card.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const confirmed = window.confirm("Se eliminará esta propiedad. ¿Deseas continuar?");
        if (!confirmed) return;

        try {
          await deleteProperty(property.id);
          setAppFeedback("La propiedad se eliminó correctamente.", "success");
          await loadProperties();
          renderPropertyManager();
          renderCards();
        } catch (error) {
          setAppFeedback(error.message || "No se pudo eliminar la propiedad.");
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
  if (!mapElement || typeof L === "undefined" || state.map) return;

  const laPazBounds = L.latLngBounds(LA_PAZ_BOUNDS);

  state.map = L.map("map", {
    zoomControl: true,
    maxBounds: laPazBounds,
    maxBoundsViscosity: 1,
    minZoom: 11,
  }).setView(LA_PAZ_CENTER, LA_PAZ_DEFAULT_ZOOM);
  window.__dynapazMap = state.map;

  state.map.fitBounds(laPazBounds);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);

  state.map.on("click", (event) => {
    if (!state.isPickingLocation) return;

    if (!laPazBounds.contains(event.latlng)) {
      updateLocationPickerStatus("Solo puedes fijar ubicaciones dentro de La Paz, Bolivia.", "error");
      return;
    }

    const coords = [event.latlng.lat, event.latlng.lng];
    setDraftLocation(coords);
  });
}

async function loadProperties(){
  state.properties = await getProperties();
  syncMarkers();
}

async function loadDashboardData(){
  const [users, properties, notifications] = await Promise.all([getUsers(), getProperties(), getInterests()]);
  state.users = users;
  state.properties = properties;
  state.notifications = notifications;
  renderSessionSummary();

  if (isWorkspaceDashboard()) {
    renderActiveWorkspaceSection();
    return;
  }

  syncMarkers();
  renderProfiles();
  renderPropertyManager();
  renderNotifications();
  renderCards();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (window.__dynapazSkipDashboardBootstrap) return;

    state.currentUser = await requireAuth();
    if (!state.currentUser) return;

    renderSessionSummary();
    initCatalogToggle();
    initFilters();
    initSearch();

    if (!isWorkspaceDashboard()) {
      initMap();
    }

    await loadDashboardData();
  } catch (error) {
    console.warn("Error al cargar el panel:", error?.message);
  }
});
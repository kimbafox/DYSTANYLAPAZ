function renderNotifications(){
  const container = document.getElementById("notificationsInbox");
  const counter = document.getElementById("notificationsCount");
  if (counter) {
    counter.textContent = String(state.notifications.length);
  }

  if (!container) return;

  if (!state.notifications.length) {
    container.innerHTML = '<div class="emptyState">Todavía no tienes interesados registrados.</div>';
    return;
  }

  container.innerHTML = state.notifications.map((notification) => `
    <article class="notificationCard">
      <div class="notificationCard__top">
        <div>
          <h3 class="notificationCard__title">${escapeHtml(notification.interestedName)}</h3>
          <p class="notificationCard__meta">Interesado en ${escapeHtml(notification.propertyTitle)}</p>
        </div>
        <span class="rolePill rolePill--accent">${formatDateTime(notification.updatedAt || notification.createdAt)}</span>
      </div>
      <div class="notificationCard__grid">
        <div class="profileLine"><strong>Correo</strong>${escapeHtml(notification.interestedEmail)}</div>
        <div class="profileLine"><strong>Teléfono</strong>${escapeHtml(notification.interestedPhone)}</div>
        <div class="profileLine"><strong>CI</strong>${escapeHtml(notification.interestedCi)}</div>
        <div class="profileLine"><strong>Dirección</strong>${escapeHtml(notification.interestedAddress)}</div>
      </div>
      <p class="notificationCard__meta">Propiedad: ${escapeHtml(notification.propertyTitle)} · ${escapeHtml(notification.propertyZone)}</p>
    </article>
  `).join("");
}

function renderActiveWorkspaceSection(sectionName = getActiveWorkspaceSection()){
  if (!isWorkspaceDashboard()) return;

  if (["perfil", "directorio", "cuentas"].includes(sectionName)) {
    renderProfiles();
    return;
  }

  if (sectionName === "propiedades") {
    renderPropertyManager();
    return;
  }

  if (sectionName === "interesados") {
    renderNotifications();
    return;
  }

  if (sectionName === "mapa") {
    initMap();
    syncMarkers();
    if (state.map) {
      window.setTimeout(() => state.map.invalidateSize(), 180);
    }
  }
}

window.__dynapazDashboard = {
  activateSection(sectionName){
    renderActiveWorkspaceSection(sectionName);
  },
};

function renderProfiles(){
  const profileContent = document.getElementById("profileContent");
  const profilesDirectory = document.getElementById("profilesDirectory");
  const profilesTitle = document.getElementById("profilesTitle");
  const profilesHint = document.getElementById("profilesHint");

  if (!state.currentUser) return;

  if (profileContent) {
    profileContent.innerHTML = profileMarkup(state.currentUser);
  }

  const isAdmin = tieneRol(state.currentUser, "admin");
  if (profilesTitle) {
    profilesTitle.textContent = isAdmin ? "Cuentas registradas" : "Perfiles registrados";
  }

  if (profilesHint) {
    profilesHint.textContent = isAdmin
      ? "Revisa cuentas y elimina solo cuando sea necesario."
      : "Directorio visible del sistema.";
  }

  if (!profilesDirectory) return;

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
          ? "Publica y administra las propiedades de tu cuenta."
          : "Tu cuenta solo puede ver propiedades."}
      </p>
    </div>

    ${canManageProperties() ? `
      <form id="propertyForm" class="propertyForm">
        <div class="authGrid">
          <input id="propertyTitle" type="text" placeholder="Título de la propiedad" required>
          <input id="propertyZone" type="text" placeholder="Zona" required>
          <input id="propertyPrice" type="number" min="1" placeholder="Precio en bolivianos" required>
          <input id="propertyCoords" type="text" placeholder="Latitud, Longitud" readonly required>
          <input id="propertyImages" type="text" placeholder="Imagenes separadas por coma" required>
        </div>
        <div class="locationPickerRow">
          <button type="button" id="pickLocationBtn" class="cta">Seleccionar ubicación en el mapa</button>
          <button type="button" id="clearLocationBtn" class="ghostAction">Limpiar ubicación</button>
        </div>
        <p id="locationPickerStatus" class="helperText">Haz clic en el botón y luego selecciona el punto exacto de la casa en el mapa.</p>
        <p class="helperText helperText--neutral">La categoría de valor se calcula automáticamente según el precio ingresado.</p>
        <textarea id="propertyDesc" placeholder="Descripción" required></textarea>
        <p id="propertyFeedback" class="feedback" hidden></p>
        <button type="submit">Publicar propiedad</button>
      </form>
    ` : `
      <div class="emptyState">Tu cuenta solo puede revisar propiedades visibles.</div>
    `}

    <div class="managedProperties">
      <h3 class="subTitle">${canManageProperties() ? "Mis propiedades" : "Propiedades visibles"}</h3>
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
              <div class="profileLine"><strong>Estado</strong>${property.status === "vendida" ? "Vendida" : "Disponible"}</div>
              <div class="profileLine"><strong>Contacto</strong>${escapeHtml(property.ownerPhone || "Sin teléfono")}</div>
            </div>
            ${canDeleteProperty(property) ? `
              <div class="sessionCard__actions">
                <button class="ghostAction" data-toggle-property-status="${property.id}" data-next-status="${property.status === "vendida" ? "disponible" : "vendida"}">${property.status === "vendida" ? "Marcar disponible" : "Marcar vendida"}</button>
                <button class="dangerBtn" data-delete-property="${property.id}">Eliminar propiedad</button>
              </div>
            ` : ""}
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

  manager.querySelectorAll("[data-toggle-property-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const propertyId = button.getAttribute("data-toggle-property-status");
      const nextStatus = button.getAttribute("data-next-status") || "disponible";
      if (!propertyId) return;

      try {
        await updatePropertyStatus(propertyId, nextStatus);
        await loadProperties();
        renderPropertyManager();
        renderProfiles();
        renderCards();
      } catch (error) {
        alert(error.message || "No se pudo actualizar el estado de la propiedad.");
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
    priceBOB: Number(document.getElementById("propertyPrice")?.value || 0),
    coords,
    images: String(document.getElementById("propertyImages")?.value || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    desc: document.getElementById("propertyDesc")?.value || "",
    isNew: true,
  };

  payload.category = inferPropertyCategory(payload.priceBOB);

  button.disabled = true;
  setPropertyFeedback("");

  try {
    await createProperty(payload);
    event.currentTarget.reset();
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

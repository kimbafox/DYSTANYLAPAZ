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
    if (state.map) {
      window.setTimeout(() => state.map.invalidateSize(), 180);
    }
    return;
  }

  if (sectionName === "interesados") {
    renderNotifications();
    return;
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

  const rankedUsers = [...state.users].sort((left, right) => {
    const leftSeller = tieneRol(left, "vendedor") ? 1 : 0;
    const rightSeller = tieneRol(right, "vendedor") ? 1 : 0;
    if (leftSeller !== rightSeller) return rightSeller - leftSeller;

    const leftSold = getUserPropertySummary(left.id).soldCount;
    const rightSold = getUserPropertySummary(right.id).soldCount;
    return rightSold - leftSold;
  });

  if (!state.currentUser) return;

  if (profileContent) {
    profileContent.innerHTML = profileMarkup(state.currentUser);
  }

  const isAdmin = tieneRol(state.currentUser, "admin");
  if (profilesTitle) {
    profilesTitle.textContent = isAdmin ? "Cuentas registradas" : "Perfiles registrados";
  }

  if (profilesHint) {
    const sellerCount = state.users.filter((user) => tieneRol(user, "vendedor")).length;
    const soldCount = state.properties.filter((property) => property.status === "vendida").length;
    profilesHint.textContent = isAdmin
      ? `Directorio de vendedores y cuentas registradas. Hay ${sellerCount} vendedores activos y ${soldCount} propiedades vendidas.`
      : `Directorio visible del sistema con vendedores destacados, ventas registradas y perfiles actualizados.`;
  }

  if (!profilesDirectory) return;

  profilesDirectory.innerHTML = rankedUsers
    .map((user) => profileMarkup(user, { canDelete: isAdmin && user.id !== state.currentUser.id }))
    .join("");

  // Attach handlers for "Ver perfil" buttons to load other users into the profile panel
  profilesDirectory.querySelectorAll('[data-view-user]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const userId = btn.getAttribute('data-view-user');
      if (!userId) return;
      const user = state.users.find((u) => u.id === userId);
      if (!user) return;
      const profileContent = document.getElementById('profileContent');
      if (profileContent) {
        profileContent.innerHTML = profileMarkup(user);
        // Scroll to profile section for visibility
        profileContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

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
        setPropertyFeedback("Usuario eliminado correctamente.", "success");
      } catch (error) {
        setPropertyFeedback(error.message || "No se pudo eliminar el usuario.");
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
          <div>
            <input id="propertyImages" type="file" accept="image/*" multiple required>
            <div id="propertyImagesPreview" class="imagesPreview" aria-live="polite"></div>
          </div>
        </div>
        <div class="locationPickerRow">
          <button type="button" id="pickLocationBtn" class="cta">Seleccionar ubicación en el mapa</button>
          <button type="button" id="clearLocationBtn" class="ghostAction">Limpiar ubicación</button>
        </div>
        <p id="locationPickerStatus" class="helperText">Haz clic en el botón y selecciona la ubicación en el mapa. La coordenada se guarda automáticamente.</p>
        <p class="helperText helperText--neutral">La categoría de valor se calcula automáticamente según el precio ingresado.</p>
        <textarea id="propertyDesc" placeholder="Descripción" required></textarea>
        <p id="propertyFeedback" class="feedback" hidden></p>
        <button type="submit">Publicar propiedad</button>
      </form>

      <div class="portalPanel__head">
        <h3 class="subTitle">Mapa de publicación</h3>
        <p class="portalPanel__hint">Debajo del formulario puedes fijar la ubicación exacta de la casa.</p>
      </div>
      <div id="map" class="map"></div>
    ` : `
      <div class="emptyState">Tu cuenta solo puede revisar propiedades visibles.</div>
    `}

    <div class="managedProperties">
      <h3 class="subTitle">${canManageProperties() ? "Mis propiedades" : "Propiedades visibles"}</h3>
      ${listedProperties.length
        ? listedProperties.map((property) => {
            const propertyImages = getPropertyImages(property);
            return `
              <article class="profileCard propertyCard--featured">
                <div class="propertyCard__media">
                  <img class="propertyCard__thumb" src="${escapeHtml(propertyImages[0])}" alt="${escapeHtml(property.title)}" loading="lazy" decoding="async">
                </div>
                <div class="propertyCard__content">
                  <div class="profileCard__top propertyCard__top--stacked">
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
                  <p class="propertyCard__hint">${escapeHtml(property.desc || "Sin descripción adicional.")}</p>
                  ${canDeleteProperty(property) ? `
                    <div class="sessionCard__actions">
                      <button class="ghostAction" data-toggle-property-status="${property.id}" data-next-status="${property.status === "vendida" ? "disponible" : "vendida"}">${property.status === "vendida" ? "Marcar disponible" : "Marcar vendida"}</button>
                      <button class="dangerBtn" data-delete-property="${property.id}">Eliminar propiedad</button>
                    </div>
                  ` : ""}
                </div>
              </article>
            `;
          }).join("")
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

  const imagesInput = document.getElementById('propertyImages');
  if (imagesInput) {
    imagesInput.addEventListener('change', handleImageSelection);
  }

  manager.querySelectorAll("[data-delete-property]").forEach((button) => {
    button.addEventListener("click", async () => {
      const propertyId = button.getAttribute("data-delete-property");
      if (!propertyId) return;

      const confirmed = window.confirm("Se eliminará esta propiedad del sistema. ¿Deseas continuar?");
      if (!confirmed) return;

      try {
        await deleteProperty(propertyId);
        setPropertyFeedback("Propiedad eliminada correctamente.", "success");
        await loadProperties();
        renderPropertyManager();
        renderCards();
      } catch (error) {
        setPropertyFeedback(error.message || "No se pudo eliminar la propiedad.");
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
        setPropertyFeedback("Estado actualizado correctamente.", "success");
        await loadProperties();
        renderPropertyManager();
        renderProfiles();
        renderCards();
      } catch (error) {
        setPropertyFeedback(error.message || "No se pudo actualizar el estado de la propiedad.");
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
  state.draftCoords = null;
  if (state.map) {
    state.map.getContainer().classList.remove("map--picking");
  }

  if (state.draftMarker && state.map) {
    state.map.removeLayer(state.draftMarker);
  }
  state.draftMarker = null;
  updateLocationPickerStatus("Haz clic en el botón y selecciona la ubicación en el mapa. Se guarda automáticamente.", "neutral");
}

function setDraftLocation(coords){
  state.draftCoords = coords.map((value) => Number(value));

  if (!state.map) return;

  if (!state.draftMarker) {
    state.draftMarker = L.marker(coords, { draggable: false }).addTo(state.map);
  } else {
    state.draftMarker.setLatLng(coords);
  }

  state.map.getContainer().classList.remove("map--picking");
  state.isPickingLocation = false;
  updateLocationPickerStatus(`Ubicación fijada: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}. Ya puedes publicar la propiedad.`, "success");
}

function renderImagePreviews(files){
  const container = document.getElementById("propertyImagesPreview");
  if (!container) return;
  container.innerHTML = "";
  (files || []).forEach((file) => {
    const wrap = document.createElement("div");
    wrap.className = "imagesPreview__item";
    const img = document.createElement("img");
    img.className = "imagesPreview__img";
    img.alt = file.name || "Imagen seleccionada";
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    wrap.appendChild(img);
    container.appendChild(wrap);
  });
}

function handleImageSelection(event){
  const input = event.currentTarget;
  const files = Array.from(input.files || []).slice(0, 6);
  state.selectedPropertyImages = files;
  renderImagePreviews(files);
}

function resizeImageFile(file, maxWidth = 1200, quality = 0.75){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado'));
      img.onload = () => {
        const ratio = img.width / img.height;
        const width = Math.min(img.width, maxWidth);
        const height = Math.round(width / ratio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handlePropertySubmit(event){
  event.preventDefault();

  const button = event.currentTarget.querySelector("button[type='submit']");
  const coords = Array.isArray(state.draftCoords) && state.draftCoords.length === 2
    ? state.draftCoords.map((value) => Number(value))
    : [];

  if (!coords.length || coords.some((value) => !Number.isFinite(value))) {
    setPropertyFeedback("Selecciona la ubicación en el mapa antes de publicar la propiedad.");
    return;
  }

  const payload = {
    title: document.getElementById("propertyTitle")?.value || "",
    zone: document.getElementById("propertyZone")?.value || "",
    priceBOB: Number(document.getElementById("propertyPrice")?.value || 0),
    coords,
    images: [],
    desc: document.getElementById("propertyDesc")?.value || "",
    isNew: true,
  };

  payload.category = inferPropertyCategory(payload.priceBOB);

  button.disabled = true;
  setPropertyFeedback("");

  // Procesar imágenes seleccionadas (si las hay): redimensionar y convertir a data URLs
  try {
    const fileInput = document.getElementById('propertyImages');
    const files = state.selectedPropertyImages || (fileInput ? Array.from(fileInput.files || []) : []);
    if (files && files.length) {
      setPropertyFeedback('Procesando imágenes...', 'pending');
      const dataUrls = [];
      for (let i = 0; i < files.length && i < 6; i++) {
        try {
          const dataUrl = await resizeImageFile(files[i], 1200, 0.75);
          dataUrls.push(dataUrl);
        } catch (err) {
          console.warn('No se pudo procesar imagen', files[i].name, err);
        }
      }
      payload.images = dataUrls;
    } else {
      // Legacy: permitir URLs separadas por coma
      payload.images = String(document.getElementById("propertyImages")?.value || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
  } catch (err) {
    console.error('Error procesando imágenes', err);
  } finally {
    setPropertyFeedback('');
  }

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

const SESSION_TOKEN_KEY = "dynapaz_session_token";
const USERS_STORAGE_KEY = "dynapaz_users";
const PROPERTIES_STORAGE_KEY = "dynapaz_properties";
const INTERESTS_STORAGE_KEY = "dynapaz_interests";
const API_BASE = "/api";

const DEMO_USERS = [
	{
		id: "admin-base",
		nombre: "Admin",
		apellido: "DYNApaz",
		correo: "admin@gmail.com",
		password: "Admin123",
		telefono: "70000001",
		ci: "1000001 LP",
		direccion: "Oficina central, La Paz",
		fechaNacimiento: "1990-01-01",
		roles: ["admin"],
	},
	{
		id: "vendedor-base",
		nombre: "Lucia",
		apellido: "Quispe",
		correo: "vendedor@gmail.com",
		password: "Vendedor123",
		telefono: "70000002",
		ci: "1000002 LP",
		direccion: "Calacoto, La Paz",
		fechaNacimiento: "1994-05-18",
		roles: ["usuario", "vendedor"],
	},
	{
		id: "usuario-base",
		nombre: "Mario",
		apellido: "Choque",
		correo: "usuario@gmail.com",
		password: "Usuario123",
		telefono: "70000003",
		ci: "1000003 LP",
		direccion: "Miraflores, La Paz",
		fechaNacimiento: "1998-10-09",
		roles: ["usuario"],
	},
];

const DEMO_PROPERTIES = [
	{
		id: "lp-001",
		title: "Casa moderna en Calacoto",
		zone: "Zona Sur • Calacoto",
		category: "alto",
		status: "disponible",
		isNew: true,
		priceBOB: 1705200,
		desc: "4 dormitorios, garaje, jardín y excelente iluminación.",
		coords: [-16.5406, -68.0775],
		images: ["./assets/houses/casa1_1.jpg", "./assets/houses/casa1_2.jpg"],
		ownerId: "vendedor-base",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "lp-002",
		title: "Departamento cómodo en Miraflores",
		zone: "Centro • Miraflores",
		category: "medio",
		status: "vendida",
		isNew: false,
		priceBOB: 682080,
		desc: "2 dormitorios, balcón y acceso rápido a hospitales y universidades.",
		coords: [-16.5, -68.1223],
		images: ["./assets/houses/casa1_2.jpg", "./assets/houses/casa1_1.jpg"],
		ownerId: "vendedor-base",
		createdAt: "2026-01-02T00:00:00.000Z",
	},
	{
		id: "lp-003",
		title: "Casa económica cerca del centro",
		zone: "Norte • Sector accesible",
		category: "economico",
		status: "disponible",
		isNew: false,
		priceBOB: 361920,
		desc: "3 dormitorios, patio y buena proyección para primera compra.",
		coords: [-16.4897, -68.162],
		images: ["./assets/houses/casa1_1.jpg"],
		ownerId: "admin-base",
		createdAt: "2026-01-03T00:00:00.000Z",
	},
];

let currentUserCache = null;

const DEMO_INTERESTS = [];

function clone(value){
	return JSON.parse(JSON.stringify(value));
}

function initPrototypeStorage(){
	if (!localStorage.getItem(USERS_STORAGE_KEY)) {
		localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEMO_USERS));
	}

	if (!localStorage.getItem(PROPERTIES_STORAGE_KEY)) {
		localStorage.setItem(PROPERTIES_STORAGE_KEY, JSON.stringify(DEMO_PROPERTIES));
	}

	if (!localStorage.getItem(INTERESTS_STORAGE_KEY)) {
		localStorage.setItem(INTERESTS_STORAGE_KEY, JSON.stringify(DEMO_INTERESTS));
	}
}

function readStorage(key, fallback){
	initPrototypeStorage();
	try {
		return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
	} catch {
		return clone(fallback);
	}
}

function writeStorage(key, value){
	localStorage.setItem(key, JSON.stringify(value));
}

async function apiRequest(path, options = {}){
	const token = getSessionToken();
	const headers = {
		...(options.body ? { "Content-Type": "application/json" } : {}),
		...(options.headers || {}),
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE}${path}`, {
		method: options.method || "GET",
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	});

	let payload = {};
	try {
		payload = await response.json();
	} catch {
		payload = {};
	}

	if (!response.ok) {
		throw new Error(payload.error || "No se pudo completar la solicitud.");
	}

	return payload;
}

function getUsersDb(){
	return readStorage(USERS_STORAGE_KEY, DEMO_USERS);
}

function saveUsersDb(users){
	writeStorage(USERS_STORAGE_KEY, users);
}

function syncUsersCache(users){
	const sanitizedUsers = Array.isArray(users) ? users.map((user) => publicUser(user)) : [];
	saveUsersDb(sanitizedUsers);

	if (currentUserCache) {
		const refreshedCurrentUser = sanitizedUsers.find((user) => user.id === currentUserCache.id);
		if (refreshedCurrentUser) {
			currentUserCache = refreshedCurrentUser;
		}
	}

	return sanitizedUsers;
}

function upsertUserCache(user){
	if (!user) return null;

	const sanitizedUser = publicUser(user);
	const users = getUsersDb().map((item) => publicUser(item));
	const nextUsers = users.filter((item) => item.id !== sanitizedUser.id);
	nextUsers.push(sanitizedUser);
	saveUsersDb(nextUsers);
	return sanitizedUser;
}

function removeUserCache(userId){
	saveUsersDb(getUsersDb().filter((user) => user.id !== userId));
}

function normalizePhone(phone){
	return String(phone || "").replace(/\D/g, "");
}

function buildWhatsappLink(phone, message = ""){
	const digits = normalizePhone(phone);
	if (!digits) return "";

	const fullNumber = digits.startsWith("591") ? digits : `591${digits}`;
	const text = String(message || "").trim();
    return `https://wa.me/${fullNumber}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function normalizeProperty(property){
	return {
		...clone(property),
		status: property?.status === "vendida" ? "vendida" : "disponible",
	};
}

function getPropertiesDb(){
	return readStorage(PROPERTIES_STORAGE_KEY, DEMO_PROPERTIES).map((property) => normalizeProperty(property));
}

function savePropertiesDb(properties){
	writeStorage(PROPERTIES_STORAGE_KEY, properties);
}

function getInterestsDb(){
	return readStorage(INTERESTS_STORAGE_KEY, DEMO_INTERESTS);
}

function saveInterestsDb(interests){
	writeStorage(INTERESTS_STORAGE_KEY, interests);
}

function publicUser(user){
	if (!user) return null;
	const { password, ...rest } = user;
	return clone(rest);
}

function createId(prefix){
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildOwnerSummary(owner, properties){
	if (!owner) return null;

	const ownerProperties = properties.filter((property) => property.ownerId === owner.id);
	const soldProperties = ownerProperties.filter((property) => property.status === "vendida");

	return {
		id: owner.id,
		nombreCompleto: `${owner.nombre} ${owner.apellido}`,
		correo: owner.correo,
		telefono: owner.telefono,
		roles: Array.isArray(owner.roles) ? [...owner.roles] : [],
		whatsappLink: buildWhatsappLink(owner.telefono),
		publishedCount: ownerProperties.length,
		soldCount: soldProperties.length,
		soldProperties: soldProperties.map((property) => ({
			id: property.id,
			title: property.title,
			zone: property.zone,
		})),
	};
}

function enrichProperty(property, users){
	const normalizedProperty = normalizeProperty(property);
	const owner = users.find((user) => user.id === property.ownerId);
	return {
		...normalizedProperty,
		ownerName: owner ? `${owner.nombre} ${owner.apellido}` : "Sin asignar",
		ownerPhone: owner?.telefono || "",
		ownerWhatsappLink: owner
			? buildWhatsappLink(owner.telefono, `Hola ${owner.nombre}, vi tu propiedad ${normalizedProperty.title} en DYNApaz 87 y quiero mas informacion.`)
			: "",
		ownerSummary: buildOwnerSummary(owner, getPropertiesDb()),
	};
}

function enrichInterest(interest, users, properties){
	const interestedUser = users.find((user) => user.id === interest.interestedUserId);
	const property = properties.find((item) => item.id === interest.propertyId);
	const owner = property ? users.find((user) => user.id === property.ownerId) : null;

	return {
		...clone(interest),
		propertyTitle: property?.title || "Propiedad eliminada",
		propertyZone: property?.zone || "Sin zona",
		ownerId: property?.ownerId || interest.ownerId,
		ownerName: owner ? `${owner.nombre} ${owner.apellido}` : "Sin propietario",
		interestedName: interestedUser ? `${interestedUser.nombre} ${interestedUser.apellido}` : "Usuario eliminado",
		interestedEmail: interestedUser?.correo || "",
		interestedPhone: interestedUser?.telefono || "",
		interestedCi: interestedUser?.ci || "",
		interestedAddress: interestedUser?.direccion || "",
	};
}

function validatePropertyPayload(payload){
	if (!payload.title || !payload.zone || !payload.category || !payload.desc) {
		return "Completa el titulo, zona, categoria y descripcion.";
	}

	if (!Number.isFinite(Number(payload.priceBOB)) || Number(payload.priceBOB) <= 0) {
		return "Ingresa un precio valido.";
	}

	if (!Array.isArray(payload.coords) || payload.coords.length !== 2 || payload.coords.some((value) => !Number.isFinite(Number(value)))) {
		return "Selecciona una ubicacion valida en el mapa.";
	}

	return "";
}

function validarCorreo(correo){
	const regex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|hotmail\.com)$/;
	return regex.test(String(correo || "").trim().toLowerCase());
}

function normalizarTexto(texto){
	return String(texto || "").trim().replace(/\s+/g, " ");
}

function normalizarCorreo(correo){
	return String(correo || "").trim().toLowerCase();
}

function getSessionToken(){
	return localStorage.getItem(SESSION_TOKEN_KEY) || "";
}

function saveSession(token, user){
	localStorage.setItem(SESSION_TOKEN_KEY, token);
	currentUserCache = user || null;
}

function clearSession(){
	localStorage.removeItem(SESSION_TOKEN_KEY);
	currentUserCache = null;
}

function setAuthFeedback(message, type = "error"){
	const isRegister = document.querySelector('.authAnim')?.classList.contains('is-register')
		|| document.querySelector('.authCard')?.classList.contains('active');
	const feedback = document.getElementById(isRegister ? "regFeedback" : "authFeedback")
		|| document.getElementById("authFeedback");
	if (!feedback) {
		if (message) alert(message);
		return;
	}

	feedback.hidden = !message;
	feedback.textContent = message;
	feedback.className = `feedback feedback--${type}`;
}

function setButtonBusy(button, busy, labelBusy){
	if (!button) return;
	if (!button.dataset.defaultLabel) {
		button.dataset.defaultLabel = button.textContent;
	}

	button.disabled = busy;
	button.textContent = busy ? labelBusy : button.dataset.defaultLabel;
}

function tieneRol(user, role){
	return Boolean(user && Array.isArray(user.roles) && user.roles.includes(role));
}

function obtenerRolesRegistro(){
	return ["usuario"];
}

function obtenerDatosFormularioRegistro(){
	return {
		nombre: document.getElementById("nombre")?.value || "",
		apellido: document.getElementById("apellido")?.value || "",
		correo: document.getElementById("correo")?.value || "",
		password: document.getElementById("password")?.value || "",
		telefono: document.getElementById("telefono")?.value || "",
		ci: document.getElementById("ci")?.value || "",
		direccion: document.getElementById("direccion")?.value || "",
		fechaNacimiento: document.getElementById("fechaNacimiento")?.value || "",
		roles: obtenerRolesRegistro(),
	};
}

function validarRegistro(data){
	const nombre = normalizarTexto(data.nombre);
	const apellido = normalizarTexto(data.apellido);
	const telefono = String(data.telefono || "").replace(/\D/g, "");
	const ci = String(data.ci || "").trim().toUpperCase();

	if (!nombre || !apellido) {
		return "Ingresa nombre y apellido.";
	}

	if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre) || !/^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(apellido)) {
		return "Nombre y apellido solo pueden contener letras y espacios.";
	}

	if (!validarCorreo(data.correo)) {
		return "Solo se permiten correos Gmail o Hotmail.";
	}

	if (!data.password || data.password.length < 6) {
		return "La contraseña debe tener al menos 6 caracteres.";
	}

	if (!/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) {
		return "La contraseña debe incluir letras y números.";
	}

	if (!telefono || !/^\d{7,8}$/.test(telefono)) {
		return "El teléfono debe tener entre 7 y 8 dígitos numéricos.";
	}

	if (!ci || !/^[A-Z0-9-]{5,20}$/.test(ci)) {
		return "La CI solo puede tener letras, números y guiones.";
	}

	if (!data.direccion || String(data.direccion).trim().length < 5) {
		return "La dirección debe tener al menos 5 caracteres.";
	}

	if (!data.fechaNacimiento) {
		return "Selecciona tu fecha de nacimiento.";
	}

	return "";
}

function generarContrasenaTemporal(){
	return `Reset${Math.floor(1000 + Math.random() * 9000)}`;
}

function recuperarContrasena(correo){
	const correoNorm = normalizarCorreo(correo);
	if (!validarCorreo(correoNorm)) {
		setAuthFeedback("Ingresa un correo Gmail o Hotmail válido para recuperar tu contraseña.");
		return false;
	}

	try {
		initPrototypeStorage();
		const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
		const found = users.find((user) => normalizarCorreo(user.correo) === correoNorm);
		if (!found) {
			setAuthFeedback("No encontramos una cuenta con ese correo.");
			return false;
		}

		const respuesta = window.prompt("Para seguridad, confirma tu dirección registrada para verificar tu identidad:", "");
		if (!respuesta || normalizarTexto(found.direccion) !== normalizarTexto(respuesta)) {
			setAuthFeedback("La respuesta de seguridad no coincide con tu perfil. No se cambió la contraseña.");
			return false;
		}

		const temporal = generarContrasenaTemporal();
		found.password = temporal;
		localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
		setAuthFeedback(`Contraseña temporal asignada: ${temporal}. Inicia sesión y cámbiala después.`, "success");
		return true;
	} catch (error) {
		setAuthFeedback(error.message || "No se pudo recuperar la contraseña.");
		return false;
	}
}

async function getCurrentUser(force = false){
	initPrototypeStorage();

	if (!force && currentUserCache) {
		return currentUserCache;
	}

	const sessionUserId = getSessionToken();
	if (!sessionUserId) {
		return null;
	}

	try {
		const response = await apiRequest("/auth/me");
		currentUserCache = upsertUserCache(response.user);
		return currentUserCache;
	} catch (error) {
		// Fallback: buscar en localStorage cuando no hay servidor
		const token = getSessionToken();
		if (token) {
			const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
			const found = users.find((u) => u.id === token);
			if (found) {
				currentUserCache = publicUser(found);
				return currentUserCache;
			}
		}
		clearSession();
		return null;
	}
}

async function getUsers(){
	try {
		const response = await apiRequest("/users");
		return syncUsersCache(response.users || []);
	} catch {
		// Fallback: devolver usuarios de localStorage cuando no hay servidor
		return getUsersDb().map((u) => publicUser(u));
	}
}

async function getProperties(){
	const users = getUsersDb();
	return getPropertiesDb().map((property) => enrichProperty(property, users));
}

async function getInterests(){
	const currentUser = await getCurrentUser();
	if (!currentUser) return [];

	const users = await getUsers();
	const properties = getPropertiesDb().map((property) => enrichProperty(property, users));
	return getInterestsDb()
		.filter((interest) => interest.ownerId === currentUser.id)
		.map((interest) => enrichInterest(interest, users, properties))
		.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

async function registerInterest(propertyId){
	const currentUser = await getCurrentUser();
	if (!currentUser) {
		throw new Error("Debes iniciar sesion para registrar tu interes.");
	}

	const properties = getPropertiesDb();
	const property = properties.find((item) => item.id === propertyId);
	if (!property) {
		throw new Error("La propiedad seleccionada ya no esta disponible.");
	}

	if (property.ownerId === currentUser.id) {
		throw new Error("No puedes registrarte como interesado en tu propia propiedad.");
	}

	const interests = getInterestsDb();
	const now = new Date().toISOString();
	const existingInterest = interests.find((interest) => interest.propertyId === propertyId && interest.interestedUserId === currentUser.id);

	if (existingInterest) {
		existingInterest.updatedAt = now;
		saveInterestsDb(interests);
		return existingInterest;
	}

	const interest = {
		id: createId("interest"),
		propertyId,
		ownerId: property.ownerId,
		interestedUserId: currentUser.id,
		createdAt: now,
		updatedAt: now,
	};

	interests.unshift(interest);
	saveInterestsDb(interests);
	return interest;
}

async function createProperty(payload){
	const currentUser = await getCurrentUser();
	if (!currentUser || (!tieneRol(currentUser, "admin") && !tieneRol(currentUser, "vendedor") && !tieneRol(currentUser, "usuario"))) {
		throw new Error("Solo usuarios, vendedores y administradores pueden publicar propiedades.");
	}

	const validationError = validatePropertyPayload(payload);
	if (validationError) {
		throw new Error(validationError);
	}

	const properties = getPropertiesDb();
	const property = {
		id: createId("prop"),
		title: String(payload.title).trim(),
		zone: String(payload.zone).trim(),
		category: String(payload.category).trim(),
		status: "disponible",
		isNew: Boolean(payload.isNew),
		priceBOB: Number(payload.priceBOB),
		desc: String(payload.desc).trim(),
		coords: payload.coords.map((value) => Number(value)),
		images: Array.isArray(payload.images) ? payload.images.map((value) => String(value).trim()).filter(Boolean) : [],
		ownerId: currentUser.id,
		createdAt: new Date().toISOString(),
	};

	properties.unshift(property);
	savePropertiesDb(properties);
	return enrichProperty(property, getUsersDb());
}

async function updatePropertyStatus(propertyId, status){
	const currentUser = await getCurrentUser();
	const properties = getPropertiesDb();
	const property = properties.find((item) => item.id === propertyId);

	if (!currentUser || !property) {
		throw new Error("Propiedad no encontrada.");
	}

	if (!tieneRol(currentUser, "admin") && property.ownerId !== currentUser.id) {
		throw new Error("Solo puedes cambiar el estado de tus propias propiedades.");
	}

	property.status = status === "vendida" ? "vendida" : "disponible";
	savePropertiesDb(properties);
	return enrichProperty(property, getUsersDb());
}

async function deleteProperty(propertyId){
	const currentUser = await getCurrentUser();
	const properties = getPropertiesDb();
	const property = properties.find((item) => item.id === propertyId);

	if (!currentUser || !property) {
		throw new Error("Propiedad no encontrada.");
	}

	if (!tieneRol(currentUser, "admin") && property.ownerId !== currentUser.id) {
		throw new Error("Solo puedes eliminar tus propias propiedades.");
	}

	savePropertiesDb(properties.filter((item) => item.id !== propertyId));
	saveInterestsDb(getInterestsDb().filter((interest) => interest.propertyId !== propertyId));
	return true;
}

async function register(){
	const button = document.querySelector(".authAnim__form--register button")
		|| document.querySelector(".authCard .form-box.register .cBtn")
		|| document.querySelector(".authBox button");
	const data = obtenerDatosFormularioRegistro();
	const error = validarRegistro(data);

	if (error) {
		setAuthFeedback(error);
		return;
	}

	setButtonBusy(button, true, "Registrando...");
	setAuthFeedback("");

	try {
		const response = await apiRequest("/auth/register", {
			method: "POST",
			body: {
				...data,
				correo: normalizarCorreo(data.correo),
			},
		});

		const user = upsertUserCache(response.user);
		saveSession(response.token, user);
		setAuthFeedback("Registro exitoso. Redirigiendo...", "success");
		window.location = "index.html";
	} catch {
		// Fallback localStorage cuando no hay servidor
		try {
			initPrototypeStorage();
			const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
			const correoNorm = normalizarCorreo(data.correo);
			if (users.find((u) => normalizarCorreo(u.correo) === correoNorm)) {
				throw new Error("Este correo ya está registrado.");
			}
			const newUser = {
				id: createId("user"),
				...data,
				correo: correoNorm,
				roles: ["usuario"],
			};
			users.push(newUser);
			localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
			saveSession(newUser.id, publicUser(newUser));
			currentUserCache = publicUser(newUser);
			setAuthFeedback("Registro exitoso. Redirigiendo...", "success");
			setTimeout(() => { window.location = "index.html"; }, 800);
		} catch (localError) {
			setAuthFeedback(localError.message || "No se pudo completar el registro.");
		}
	} finally {
		setButtonBusy(button, false, "Registrando...");
	}
}

async function login(){
	const button = document.querySelector(".authAnim__form--login button")
		|| document.querySelector(".authCard .form-box.login .cBtn")
		|| document.querySelector(".authBox button");
	const correo = normalizarCorreo(
		(document.getElementById("loginEmail") || document.getElementById("correo"))?.value || ""
	);
	const password = String(
		(document.getElementById("loginPass") || document.getElementById("password"))?.value || ""
	);

	if (!validarCorreo(correo)) {
		setAuthFeedback("Correo invalido.");
		return;
	}

	if (!password) {
		setAuthFeedback("Ingresa la contrasena.");
		return;
	}

	setButtonBusy(button, true, "Entrando...");
	setAuthFeedback("");

	try {
		const response = await apiRequest("/auth/login", {
			method: "POST",
			body: { correo, password },
		});

		const user = upsertUserCache(response.user);
		saveSession(response.token, user);
		window.location = "index.html";
	} catch {
		// Fallback localStorage cuando no hay servidor
		try {
			initPrototypeStorage();
			const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
			const found = users.find(
				(u) => normalizarCorreo(u.correo) === correo && u.password === password
			);
			if (!found) throw new Error("Correo o contraseña incorrectos.");
			const pub = publicUser(found);
			saveSession(found.id, pub);
			currentUserCache = pub;
			window.location = "index.html";
		} catch (localError) {
			setAuthFeedback(localError.message || "No se pudo iniciar sesion.");
		}
	} finally {
		setButtonBusy(button, false, "Entrando...");
	}
}

async function logout(){
	try {
		await apiRequest("/auth/logout", { method: "POST" });
	} catch {
		// Si la sesion ya expiro en servidor, limpiamos cliente igual.
	}

	clearSession();
	window.location = "login.html";
}

async function eliminarUsuario(userId){
	const currentUser = await getCurrentUser();
	if (!tieneRol(currentUser, "admin")) {
		throw new Error("Solo un administrador puede eliminar usuarios.");
	}

	if (currentUser.id === userId) {
		throw new Error("No puedes eliminar tu propio usuario desde el prototipo.");
	}

	await apiRequest(`/users/${userId}`, { method: "DELETE" });
	removeUserCache(userId);
	savePropertiesDb(getPropertiesDb().filter((property) => property.ownerId !== userId));
	saveInterestsDb(getInterestsDb().filter((interest) => interest.ownerId !== userId && interest.interestedUserId !== userId));
	return true;
}

async function requireAuth(){
	const pathname = window.location.pathname || "";
	const fileName = pathname.split("/").pop() || "";
	const isAuthView = fileName === "login.html" || fileName === "registro.html";

	try {
		const currentUser = await getCurrentUser();

		if (!currentUser && !isAuthView) {
			window.location = "login.html";
			return null;
		}

		if (currentUser && isAuthView) {
			window.location = "index.html";
			return currentUser;
		}

		return currentUser;
	} catch (error) {
		if (!isAuthView) {
			setAuthFeedback(error.message || "No se pudo validar la sesion.");
		}
		throw error;
	}
}

window.validarCorreo = validarCorreo;
window.recuperarContrasena = recuperarContrasena;
window.login = login;
window.register = register;
window.logout = logout;
window.getUsers = getUsers;
window.getCurrentUser = getCurrentUser;
window.tieneRol = tieneRol;
window.eliminarUsuario = eliminarUsuario;
window.requireAuth = requireAuth;
window.getProperties = getProperties;
window.createProperty = createProperty;
window.updatePropertyStatus = updatePropertyStatus;
window.deleteProperty = deleteProperty;
window.getInterests = getInterests;
window.registerInterest = registerInterest;

document.addEventListener("DOMContentLoaded", async () => {
	const pathname = window.location.pathname || "";
	const fileName = pathname.split("/").pop() || "";
	if (fileName !== "login.html" && fileName !== "registro.html") return;

	try {
		await requireAuth();
	} catch (error) {
		setAuthFeedback(error.message || "No se pudo conectar con el backend.");
	}
});
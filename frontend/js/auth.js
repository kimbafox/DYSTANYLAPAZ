const SESSION_TOKEN_KEY = "dynapaz_session_token";
const USERS_STORAGE_KEY = "dynapaz_users";
const PROPERTIES_STORAGE_KEY = "dynapaz_properties";

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

function getUsersDb(){
	return readStorage(USERS_STORAGE_KEY, DEMO_USERS);
}

function saveUsersDb(users){
	writeStorage(USERS_STORAGE_KEY, users);
}

function getPropertiesDb(){
	return readStorage(PROPERTIES_STORAGE_KEY, DEMO_PROPERTIES);
}

function savePropertiesDb(properties){
	writeStorage(PROPERTIES_STORAGE_KEY, properties);
}

function publicUser(user){
	if (!user) return null;
	const { password, ...rest } = user;
	return clone(rest);
}

function createId(prefix){
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function enrichProperty(property, users){
	const owner = users.find((user) => user.id === property.ownerId);
	return {
		...clone(property),
		ownerName: owner ? `${owner.nombre} ${owner.apellido}` : "Sin asignar",
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
	const feedback = document.getElementById("authFeedback");
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
	const roleUsuario = document.getElementById("roleUsuario");
	const roleVendedor = document.getElementById("roleVendedor");
	const roles = [];

	if (roleUsuario && roleUsuario.checked) roles.push("usuario");
	if (roleVendedor && roleVendedor.checked) {
		roles.push("vendedor");
		if (!roles.includes("usuario")) roles.push("usuario");
	}

	return roles.length ? roles : ["usuario"];
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
	if (!data.nombre || !data.apellido) {
		return "Ingresa nombre y apellido.";
	}

	if (!validarCorreo(data.correo)) {
		return "Solo se permiten correos Gmail o Hotmail.";
	}

	if (!data.password || data.password.length < 6) {
		return "La contraseña debe tener al menos 6 caracteres.";
	}

	if (!data.ci || !data.telefono || !data.direccion || !data.fechaNacimiento) {
		return "Completa todos los datos personales.";
	}

	return "";
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

	const user = getUsersDb().find((item) => item.id === sessionUserId);
	if (!user) {
		clearSession();
		return null;
	}

	currentUserCache = publicUser(user);
	return currentUserCache;
}

async function getUsers(){
	return getUsersDb().map((user) => publicUser(user));
}

async function getProperties(){
	const users = getUsersDb();
	return getPropertiesDb().map((property) => enrichProperty(property, users));
}

async function createProperty(payload){
	const currentUser = await getCurrentUser();
	if (!currentUser || (!tieneRol(currentUser, "admin") && !tieneRol(currentUser, "vendedor"))) {
		throw new Error("Solo vendedores y administradores pueden publicar propiedades.");
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
	return true;
}

async function register(){
	const button = document.querySelector(".authBox button");
	const data = obtenerDatosFormularioRegistro();
	const error = validarRegistro(data);

	if (error) {
		setAuthFeedback(error);
		return;
	}

	setButtonBusy(button, true, "Registrando...");
	setAuthFeedback("");

	try {
		const users = getUsersDb();
		const correo = normalizarCorreo(data.correo);
		if (users.some((user) => normalizarCorreo(user.correo) === correo)) {
			throw new Error("Ese correo ya esta registrado.");
		}

		const user = {
			id: createId("user"),
			...data,
			correo,
			password: data.password,
		};

		users.push(user);
		saveUsersDb(users);
		saveSession(user.id, publicUser(user));
		setAuthFeedback("Registro exitoso. Redirigiendo...", "success");
		window.location = "index.html";
	} catch (requestError) {
		setAuthFeedback(requestError.message || "No se pudo completar el registro.");
	} finally {
		setButtonBusy(button, false, "Registrando...");
	}
}

async function login(){
	const button = document.querySelector(".authBox button");
	const correo = normalizarCorreo(document.getElementById("correo")?.value || "");
	const password = String(document.getElementById("password")?.value || "");

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
		const user = getUsersDb().find((item) => normalizarCorreo(item.correo) === correo && item.password === password);
		if (!user) {
			throw new Error("Correo o contrasena incorrectos.");
		}

		saveSession(user.id, publicUser(user));
		window.location = "index.html";
	} catch (requestError) {
		setAuthFeedback(requestError.message || "No se pudo iniciar sesion.");
	} finally {
		setButtonBusy(button, false, "Entrando...");
	}
}

async function logout(){
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

	const users = getUsersDb();
	const userExists = users.some((user) => user.id === userId);
	if (!userExists) {
		throw new Error("Usuario no encontrado.");
	}

	saveUsersDb(users.filter((user) => user.id !== userId));
	savePropertiesDb(getPropertiesDb().filter((property) => property.ownerId !== userId));
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
window.deleteProperty = deleteProperty;

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
function getChatElements(){
	return {
		chatBox: document.getElementById("chatBox"),
		chatButton: document.getElementById("chatButton"),
		messages: document.getElementById("mensajes"),
		input: document.getElementById("mensaje"),
	};
}

function scrollChatToBottom(){
	const { messages } = getChatElements();
	if (!messages) return;
	messages.scrollTop = messages.scrollHeight;
}

function appendMessage(type, text){
	const { messages } = getChatElements();
	if (!messages) return;

	messages.innerHTML += `<div class="msg ${type}">${text}</div>`;
	scrollChatToBottom();
}

function ensureWelcomeMessage(){
	const { messages } = getChatElements();
	if (!messages || messages.childElementCount > 0) return;

	appendMessage("agente", "Hola, cuéntanos qué propiedad te interesa y te ayudaremos a continuar.");
}

function abrirChat(){
	const { chatBox, chatButton, input } = getChatElements();
	if (!chatBox) return;

	chatBox.style.display = "flex";
	if (chatButton) {
		chatButton.style.display = "none";
	}

	ensureWelcomeMessage();
	if (input) {
		input.focus();
	}
}

function cerrarChat(){
	const { chatBox, chatButton } = getChatElements();
	if (!chatBox) return;

	chatBox.style.display = "none";
	if (chatButton) {
		chatButton.style.display = "inline-flex";
	}
}

function enviarMensaje(){
	const { input } = getChatElements();
	const texto = String(input?.value || "").trim();

	if (!texto) return;

	appendMessage("user", texto);
	if (input) {
		input.value = "";
	}

	window.setTimeout(() => {
		appendMessage("agente", "Gracias por escribir. Un asesor revisará tu interés y podrá orientarte sobre la propiedad seleccionada.");
	}, 700);
}

document.addEventListener("DOMContentLoaded", () => {
	const { input } = getChatElements();
	if (!input) return;

	input.addEventListener("keydown", (event) => {
		if (event.key !== "Enter") return;
		event.preventDefault();
		enviarMensaje();
	});
});

window.abrirChat = abrirChat;
window.cerrarChat = cerrarChat;
window.enviarMensaje = enviarMensaje;
const devBtn = document.getElementById("devFloating");
const devMessage = document.getElementById("devMessage");

devBtn.addEventListener("click", () => {
  devMessage.classList.toggle("show");
});
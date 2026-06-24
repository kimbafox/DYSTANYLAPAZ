function workspaceRoleLabel(role){
  if (role === "admin") return "Administrador";
  if (role === "vendedor") return "Vendedor";
  return "Usuario";
}

function buildWorkspaceSummary(user){
  return `
    <span class="rolePill">${user.nombre} ${user.apellido}</span>
    <span class="rolePill">${user.correo}</span>
    <span class="rolePill">${(user.roles || []).map((role) => workspaceRoleLabel(role)).join(" / ")}</span>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const workspace = document.querySelector(".docsDashboard--workspace");
  if (!workspace) return;

  const roleGuardMessage = document.getElementById("roleGuardMessage");
  const sessionSummary = document.getElementById("sessionSummary");
  const navButtons = [...document.querySelectorAll("[data-section-target]")];
  const panels = [...document.querySelectorAll("[data-section-panel]")];
  const defaultSection = workspace.dataset.defaultSection || panels[0]?.getAttribute("data-section-panel") || "perfil";
  const allowedRoles = String(workspace.dataset.allowedRoles || "usuario,vendedor,admin")
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
  const guardMessage = workspace.dataset.guardMessage || "No tienes permisos para este panel.";
  const redirectDelay = Number(workspace.dataset.redirectDelay || 1600);

  const activateSection = (sectionName) => {
    navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.getAttribute("data-section-target") === sectionName);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.getAttribute("data-section-panel") === sectionName);
    });

    if (window.__dynapazDashboard?.activateSection) {
      window.__dynapazDashboard.activateSection(sectionName);
    }
  };

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activateSection(button.getAttribute("data-section-target"));
    });
  });

  try {
    const user = await requireAuth();
    if (!user) return;

    if (sessionSummary) {
      sessionSummary.innerHTML = buildWorkspaceSummary(user);
    }

    if (!allowedRoles.some((role) => tieneRol(user, role))) {
      window.__dynapazSkipDashboardBootstrap = true;
      if (roleGuardMessage) {
        roleGuardMessage.hidden = false;
        roleGuardMessage.textContent = guardMessage;
        roleGuardMessage.className = "feedback feedback--error";
      }
      window.setTimeout(() => {
        window.location = "../index.html";
      }, redirectDelay);
      return;
    }

    activateSection(defaultSection);
  } catch (error) {
    if (roleGuardMessage) {
      roleGuardMessage.hidden = false;
      roleGuardMessage.textContent = error.message || "No se pudo validar la sesión.";
      roleGuardMessage.className = "feedback feedback--error";
    }
  }
});

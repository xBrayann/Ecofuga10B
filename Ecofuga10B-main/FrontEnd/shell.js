
(function(){
  function renderHeader() {
    const mount = document.getElementById('app-header');
    if (!mount) return;

    const logged = localStorage.getItem('usuarioLogueado') === 'true';
    mount.innerHTML = `
      <div class="app-header">
        <div class="wrap">
          <a class="brand" href="index.html">
            <img src="icons/icon-72.png" alt="EcoFuga">
            <span>EcoFuga</span>
          </a>
          <nav class="app-nav">
            <a class="app-btn ghost" href="index.html">Inicio</a>
            <a class="app-btn ghost" href="bienvenido.html">Panel</a>
            ${logged
              ? `<button id="logoutBtn" class="app-btn">Cerrar sesión</button>`
              : `<a class="app-btn" href="auth.html">Ingresar</a>`}
          </nav>
        </div>
      </div>
    `;

    const btn = document.getElementById('logoutBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        localStorage.removeItem('usuarioLogueado');
        localStorage.removeItem('session_user_email');
        localStorage.removeItem('session_user_name');
        localStorage.removeItem('session_token');
        location.href = 'auth.html';
      });
    }
  }

  function mountOfflineBanner() {
    if (!document.getElementById('offline-banner')) {
      const b = document.createElement('div');
      b.id = 'offline-banner';
      b.textContent = '⚠️ Sin conexión — Estás en modo offline';
      document.body.appendChild(b);
    }
    const update = () => {
      document.getElementById('offline-banner').style.display = navigator.onLine ? 'none' : 'block';
    };
    window.addEventListener('online',  update);
    window.addEventListener('offline', update);
    update();
  }

  // Guards de sesión por página
  function sessionGuards() {
    const logged = localStorage.getItem('usuarioLogueado') === 'true';
    const page = location.pathname.split('/').pop().toLowerCase();
    if (page === 'auth.html' && logged) {
      location.replace('bienvenido.html');
    }
    if (page === 'bienvenido.html' && !logged) {
      location.replace('auth.html');
    }
   
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    mountOfflineBanner();
    sessionGuards();
  });
})();


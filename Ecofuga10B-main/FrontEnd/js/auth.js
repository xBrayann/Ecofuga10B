/* js/auth.js — EcoFuga: Happy & Unhappy Path con sesión persistente */
document.addEventListener('DOMContentLoaded', () => {
  // ---------- Estado y constantes ----------
  let isLoginMode = true;          // vista por defecto: Login
  let isEmailSent = false;
  let pendingUserData = null;
  let lockoutEndTime = null;

  const totalLockoutTime = 30 * 1000; // 30s (ajusta si quieres)

  // ---------- Elementos del DOM ----------
  const authTitle = document.getElementById('authTitle');
  const authForm = document.getElementById('authForm');
  const registerFields = document.getElementById('registerFields');
  const submitBtn = document.getElementById('submitBtn');
  const toggleBtn = document.getElementById('toggleBtn');
  const verificationMessage = document.getElementById('verificationMessage');
  const lockoutTimer = document.getElementById('lockoutTimer');
  const timerSpan = document.getElementById('timer');
  const progressFill = document.getElementById('progressFill');
  const resendBtn = document.getElementById('resendBtn');

  // ---------- Guard: si ya hay sesión activa, saltar login ----------
  if (localStorage.getItem('usuarioLogueado') === 'true') {
    window.location.href = 'bienvenido.html';
    return;
  }

  // ---------- Init UI ----------
  renderMode();       // deja la pantalla por defecto en Login
  checkLockout();     // si hay bloqueo activo, muestra timer

  // ---------- Modo Login / Registro ----------
  function renderMode() {
    if (isLoginMode) {
      authTitle.textContent = 'Iniciar Sesión';
      registerFields.classList.add('hidden');
      submitBtn.textContent = 'Iniciar Sesión';
      document.getElementById('password')?.setAttribute('autocomplete', 'current-password');
      toggleBtn.textContent = '¿No tienes cuenta? Regístrate';
    } else {
      authTitle.textContent = 'Registrarse';
      registerFields.classList.remove('hidden');
      submitBtn.textContent = 'Registrarse';
      document.getElementById('password')?.setAttribute('autocomplete', 'new-password');
      toggleBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
    }
    verificationMessage.classList.add('hidden');
    isEmailSent = false;
    pendingUserData = null;
  }

  function toggleMode() {
    isLoginMode = !isLoginMode;
    renderMode();
  }

  toggleBtn.addEventListener('click', toggleMode);

  // ---------- Lockout ----------
  function checkLockout() {
    const lockout = localStorage.getItem('lockoutEndTime');
    if (lockout) {
      lockoutEndTime = new Date(lockout);
      if (new Date() < lockoutEndTime) {
        showLockoutTimer();
      } else {
        clearLockout();
      }
    }
  }

  function showLockoutTimer() {
    lockoutTimer.classList.remove('hidden');
    authForm.classList.add('hidden');
    updateTimer();
    const interval = setInterval(() => {
      if (new Date() >= lockoutEndTime) {
        clearInterval(interval);
        clearLockout();
      } else {
        updateTimer();
      }
    }, 1000);
  }

  function updateTimer() {
    const remaining = Math.ceil((lockoutEndTime - new Date()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    const totalSeconds = totalLockoutTime / 1000;
    const progressPercentage = Math.min(100, Math.max(0, ((totalSeconds - remaining) / totalSeconds) * 100));
    progressFill.style.width = progressPercentage + '%';
  }

  function clearLockout() {
    localStorage.removeItem('lockoutEndTime');
    localStorage.removeItem('failedAttempts');
    lockoutTimer.classList.add('hidden');
    authForm.classList.remove('hidden');
    lockoutEndTime = null;
  }

  function recordFailedAttempt() {
    let attempts = parseInt(localStorage.getItem('failedAttempts') || '0', 10) + 1;
    localStorage.setItem('failedAttempts', attempts);
    if (attempts >= 3) {
      lockoutEndTime = new Date(Date.now() + totalLockoutTime);
      localStorage.setItem('lockoutEndTime', lockoutEndTime.toISOString());
      showLockoutTimer();
    }
  }

  // ---------- Validaciones ----------
  function containsInjectionAttempt(value) {
    if (!value) return false;
    const injectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT|ALERT|JAVASCRIPT|VBSCRIPT)\b)/i,
      /(--|#|\/\*|\*\/|xp_)/i,
      /('|"|`|\\|\/|%|;|>|<|<|>|&amp;)/i,
      /\b(OR|AND)\s+\d+\s*=\s*\d+/i,
      /\b(OR|AND)\s+['"][^'"]*['"]\s*=\s*['"][^'"]*['"]/i,
      /(\bTRUE\b|\bFALSE\b)/i,
      /(\bNULL\b|\bNULLIF\b)/i,
      /(\bCHAR\b|\bNCHAR\b|\bVARCHAR\b|\bNVARCHAR\b)/i,
      /(\bCAST\b|\bCONVERT\b)/i,
      /(\bWAITFOR\b|\bDELAY\b)/i
    ];
    return injectionPatterns.some(p => p.test(value));
  }

  function getPasswordSecurityLevel(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const checksPassed = [hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;

    if (password.length < minLength || checksPassed <= 1) return 'Débil';
    if (checksPassed === 2) return 'Media';
    return 'Fuerte';
  }

  function validateForm(data) {
    const { nombre, email, password, direccion, telefono } = data;

    if (!isLoginMode) {
      if (containsInjectionAttempt(nombre) || /\d/.test(nombre || "")) {
        alert('⚠️ Nombre inválido. Solo letras y espacios.'); return false;
      }
      if (containsInjectionAttempt(direccion)) {
        alert('⚠️ Dirección inválida.'); return false;
      }
      if (!/^\d{10}$/.test(telefono || "")) {
        alert('El teléfono debe tener 10 dígitos.'); return false;
      }
    }

    if (containsInjectionAttempt(email)) { alert('⚠️ Email inválido.'); return false; }
    if (!email.endsWith('@gmail.com')) { alert('Solo se permiten correos @gmail.com'); return false; }

    if (!password || password.length < 6) { alert('La contraseña debe tener al menos 6 caracteres.'); return false; }
    if (!isLoginMode) {
      const sec = getPasswordSecurityLevel(password);
      if (sec === 'Débil') { alert('La contraseña es débil. Usa mayúsculas, números y símbolos.'); return false; }
    }

    return true;
  }

  // ---------- Submit ----------
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (lockoutEndTime && new Date() < lockoutEndTime) return;

    // (opcional) si quieres bloquear por offline:
    if (!navigator.onLine) {
      alert('Estás sin conexión. Inténtalo cuando recuperes internet.');
      return;
    }

    const formData = new FormData(authForm);
    const data = Object.fromEntries(formData);

    if (!validateForm(data)) return;

    if (isLoginMode) {
      await login(data);
    } else {
      await register(data);
    }
  });

  // ---------- Registro (Happy/Unhappy) ----------
  async function register(userData) {
    try {
      const response = await fetch('http://localhost:5085/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Nombre: userData.nombre,
          Email: userData.email,
          Contraseña: userData.password,
          Direccion: userData.direccion,
          Telefono: userData.telefono
        })
      });

      const data = await safeJson(response);

      if (response.status === 409) { // Unhappy: ya existe
        alert(data?.message || 'Este correo ya está registrado.');
        return;
      }
      if (!response.ok) { // Unhappy: otra falla
        alert('Error al registrar usuario: ' + (data?.error || data?.message || response.status));
        return;
      }

      // ✅ Happy Path: registrado (pendiente verificación)
      alert('Usuario registrado. Verifica tu correo para activar la cuenta.');
      isEmailSent = true;
      pendingUserData = userData;
      verificationMessage.classList.remove('hidden');
      // Si quieres dejar en modo login:
      isLoginMode = true;
      renderMode();

    } catch (err) {
      console.error(err);
      alert('Error de conexión con la API');
    }
  }

  // ---------- Login (Happy/Unhappy) ----------
  async function login(loginData) {
    try {
      const response = await fetch('http://localhost:5085/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Email: loginData.email,
          Contraseña: loginData.password
        })
      });

      const data = await safeJson(response);

      if (response.status === 401) {      // Unhappy: no autorizado
        recordFailedAttempt();
        const msg = data?.message || 'Credenciales incorrectas';
        if (msg.toLowerCase().includes('verificado')) {
          alert('⚠️ Debes verificar tu correo antes de iniciar sesión.');
        } else {
          alert('Credenciales incorrectas. Inténtalo de nuevo.');
        }
        return;
      }

      if (response.status === 429) {      // Unhappy: rate limit
        recordFailedAttempt();
        alert('Demasiados intentos. Inténtalo más tarde.');
        return;
      }

      if (!response.ok) {                 // Unhappy: cualquier otro error
        alert('Error al iniciar sesión: ' + (data?.error || data?.message || response.status));
        return;
      }

      // ✅ Happy Path: login correcto
      clearLockout();
      // Guardar sesión persistente
      localStorage.setItem('usuarioLogueado', 'true');
      localStorage.setItem('session_user_email', data?.email || loginData.email);
      if (data?.token) localStorage.setItem('session_token', data.token);
      if (data?.nombre) localStorage.setItem('session_user_name', data.nombre);

      window.location.href = 'bienvenido.html';

    } catch (err) {
      console.error(err);
      alert('Error de conexión con la API');
    }
  }

  // ---------- Reenviar verificación (robusto) ----------
  resendBtn?.addEventListener('click', async () => {
    try {
      const email = (new FormData(authForm).get('email') || '').toString().trim();
      if (!email) { alert('Escribe tu correo para reenviar la verificación.'); return; }

      // Si tu API tiene endpoint real, descomenta y ajusta:
      // const r = await fetch('http://localhost:5085/api/usuarios/reenviar-verificacion', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ Email: email })
      // });
      // const d = await safeJson(r);
      // if (!r.ok) { alert(d?.message || 'No se pudo reenviar la verificación'); return; }

      alert('Correo de verificación reenviado (simulado). Revisa tu bandeja.');

    } catch (e) {
      console.error(e);
      alert('No se pudo reenviar la verificación.');
    }
  });

  // ---------- Helpers ----------
  async function safeJson(response) {
    try { return await response.json(); } catch { return null; }
  }
});


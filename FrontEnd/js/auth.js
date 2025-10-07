document.addEventListener('DOMContentLoaded', () => {
    let isLoginMode = true;
    let isEmailSent = false;
    let pendingUserData = null;
    let lockoutEndTime = null;
    const totalLockoutTime = 30 * 1000;

    const authTitle = document.getElementById('authTitle');
    const authForm = document.getElementById('authForm');
    const registerFields = document.getElementById('registerFields');
    const submitBtn = document.getElementById('submitBtn');
    const toggleBtn = document.getElementById('toggleBtn');
    const verificationMessage = document.getElementById('verificationMessage');
    const lockoutTimer = document.getElementById('lockoutTimer');
    const timerSpan = document.getElementById('timer');
    const progressFill = document.getElementById('progressFill');


    
    checkLockout();

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
        const progressPercentage = ((totalSeconds - remaining) / totalSeconds) * 100;
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
        let attempts = parseInt(localStorage.getItem('failedAttempts') || '0') + 1;
        localStorage.setItem('failedAttempts', attempts);
        if (attempts >= 5) {
            lockoutEndTime = new Date(Date.now() + 30 * 1000); 
            localStorage.setItem('lockoutEndTime', lockoutEndTime.toISOString());
            showLockoutTimer();
        }
    }

    function toggleMode() {
        isLoginMode = !isLoginMode;
        isEmailSent = false;
        pendingUserData = null;
        verificationMessage.classList.add('hidden');

        if (isLoginMode) {
            authTitle.textContent = 'Iniciar Sesión';
            registerFields.classList.add('hidden');
            submitBtn.textContent = 'Iniciar Sesión';
            document.getElementById('password').setAttribute('autocomplete', 'current-password');
            toggleBtn.textContent = '¿No tienes cuenta? Regístrate';
        } else {
            authTitle.textContent = 'Registrarse';
            registerFields.classList.remove('hidden');
            submitBtn.textContent = 'Registrarse';
            document.getElementById('password').setAttribute('autocomplete', 'new-password');
            toggleBtn.textContent = '¿Ya tienes cuenta? Inicia sesión';
        }
    }

    toggleBtn.addEventListener('click', toggleMode);

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (lockoutEndTime && new Date() < lockoutEndTime) {
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

    function validateForm(data) {
        const { nombre, email, password, direccion, telefono } = data;

        if (containsInjectionAttempt(nombre)) {
            alert('⚠️ Eso no se permite, por favor coloca bien los datos. El nombre solo puede contener letras y espacios.');
            return false;
        }

        if (containsInjectionAttempt(direccion)) {
            alert('⚠️ Eso no se permite, por favor coloca bien los datos. La dirección contiene caracteres no permitidos.');
            return false;
        }

        if (containsInjectionAttempt(telefono)) {
            alert('⚠️ Eso no se permite, por favor coloca bien los datos. El teléfono solo puede contener números y símbolos básicos.');
            return false;
        }

        if (containsInjectionAttempt(email)) {
            alert('⚠️ Eso no se permite, por favor coloca bien los datos. El email contiene caracteres no permitidos.');
            return false;
        }

        if (/\d/.test(nombre)) {
            alert('El nombre no puede contener números.');
            return false;
        }

        if (!isLoginMode && !/^\d{10}$/.test(telefono)) {
            alert('El número de teléfono debe tener 10 dígitos y contener solo números.');
            return false;
        }

        if (!email.endsWith('@gmail.com')) {
            alert('Formato de correo inválido. Solo se permiten correos @gmail.com');
            return false;
        }

        if (!isLoginMode) {
            const securityLevel = getPasswordSecurityLevel(password);
            if (securityLevel === 'Débil') {
                alert('La contraseña es débil. Por favor, elige una contraseña más segura.');
                return false;
            }
        }

        return true;
    }

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

        return injectionPatterns.some(pattern => pattern.test(value));
    }

    function getPasswordSecurityLevel(password) {
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        const checksPassed = [hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;

        if (password.length < minLength || checksPassed <= 1) {
            return 'Débil';
        } else if (checksPassed === 2) {
            return 'Media';
        } else {
            return 'Fuerte';
        }
    }

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

            const data = await response.json();

            if (response.status === 409) {
                alert(data.message || 'Este correo ya está registrado.');
                return;
            }

            if (!response.ok) {
                alert('Error al registrar usuario: ' + (data.error || data.message));
                return;
            }

            alert('Usuario registrado exitosamente. Por favor verifica tu correo.');
            isEmailSent = true;
            pendingUserData = userData;
            verificationMessage.classList.remove('hidden');
            toggleMode(); 
        } catch (err) {
            console.error(err);
            alert('Error de conexión con la API');
        }
    }

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

            const data = await response.json();

            if (response.status === 401) {
                recordFailedAttempt();
                const errorMessage = data.message || 'Credenciales incorrectas';
                if (errorMessage.includes('no ha sido verificado')) {
                    alert('⚠️ Necesitas verificar tu correo electrónico antes de iniciar sesión. Por favor revisa tu bandeja de entrada y sigue las instrucciones para verificar tu cuenta.');
                } else {
                    alert('Credenciales incorrectas. Inténtalo de nuevo.');
                }
                return;
            }

            if (response.status === 429) {
                recordFailedAttempt();
                return;
            }

            if (!response.ok) {
                alert('Error al iniciar sesión: ' + (data.error || data.message));
                return;
            }

            clearLockout();
            window.location.href = 'bienvenido.html';
        } catch (err) {
            console.error(err);
            alert('Error de conexión con la API');
        }
    }

    toggleMode();
});

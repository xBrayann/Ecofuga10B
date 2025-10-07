document.addEventListener('DOMContentLoaded', () => {
    // Auto-completar campos si vienen por query
    const urlParams = new URLSearchParams(window.location.search);
    const emailField = document.getElementById('email');
    const contrasenaField = document.getElementById('contraseña');

    if (urlParams.has('email')) emailField.value = urlParams.get('email');
    if (urlParams.has('contraseña')) contrasenaField.value = urlParams.get('contraseña');

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const loginData = {
            Email: emailField.value,
            Contraseña: contrasenaField.value
        };

        // fetch al login de la API
        try {
            const response = await fetch('http://localhost:5085/api/usuarios/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.message ? `${data.error}: ${data.message}` : (data.error || 'Error al iniciar sesión');
                alert(errorMsg);
                return;
            }

            // Limpiar localStorage
            localStorage.removeItem('prefillEmail');
            localStorage.removeItem('prefillContraseña');

            // Redirigir a bienvenido
            window.location.href = 'bienvenido.html';
        } catch (err) {
            console.error(err);
            alert('Error de conexión con la API');
        }
    });
});

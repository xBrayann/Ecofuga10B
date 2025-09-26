document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registroForm');
    const mensajeDiv = document.getElementById('mensaje');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usuario = {
            Nombre: document.getElementById('nombre').value,
            Email: document.getElementById('email').value,
            Contraseña: document.getElementById('contraseña').value,
            Direccion: document.getElementById('direccion').value,
            Telefono: document.getElementById('telefono').value
        };

        try {
            //Registrar usuario
            const response = await fetch('http://localhost:5085/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuario)
            });

            const data = await response.json();

            if (!response.ok) {
                mensajeDiv.textContent = data.error || 'Error al registrar usuario';
                return;
            }

            mensajeDiv.textContent = 'Usuario registrado correctamente. Redirigiendo al login...';

            //Redirigir al login con datos
            setTimeout(() => {
                localStorage.setItem('prefillEmail', usuario.Email);
                localStorage.setItem('prefillContraseña', usuario.Contraseña);
                window.location.href = 'login.html';
            }, 100); 
        } catch (err) {
            console.error(err);
            mensajeDiv.textContent = 'Error de conexión con la API';
        }
    });
});

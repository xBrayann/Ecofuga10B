using Microsoft.AspNetCore.Mvc;
using BackEnd.Models;
using BackEnd.Services;
using System.Threading.Tasks;
using BCrypt.Net;
using Microsoft.Extensions.Logging;
using FirebaseAdmin.Auth;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using System;

namespace BackEnd.Controllers
{
    public class LoginRequest
    {
        public string? Email { get; set; }
        public string? Contraseña { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class UsuariosController : ControllerBase
    {
        private readonly FirebaseService _firebaseService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<UsuariosController> _logger;
        private readonly IEmailService _emailService;

        public UsuariosController(FirebaseService firebaseService, IConfiguration configuration,
            ILogger<UsuariosController> logger, IEmailService emailService)
        {
            _firebaseService = firebaseService;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;
        }

        //REGISTRO
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Usuario usuario)
        {
            if (usuario == null || string.IsNullOrEmpty(usuario.Nombre) || string.IsNullOrEmpty(usuario.Email) || string.IsNullOrEmpty(usuario.Contraseña))
                return BadRequest("Usuario inválido. Nombre, email y contraseña son requeridos.");

            try
            {
                var usuarioExistente = await _firebaseService.GetUsuarioByEmailAsync(usuario.Email.ToLower().Trim());
                if (usuarioExistente != null)
                {
                    return Conflict(new { error = "EMAIL_EXISTS", message = "Este correo ya está registrado." });
                }

                // Crear en FirebaseAuth
                var userArgs = new UserRecordArgs()
                {
                    Email = usuario.Email,
                    Password = usuario.Contraseña,
                    DisplayName = usuario.Nombre,
                    EmailVerified = false
                };
                var userRecord = await FirebaseAuth.DefaultInstance.CreateUserAsync(userArgs);

                // Generar link de verificación
                var verificationLink = await FirebaseAuth.DefaultInstance.GenerateEmailVerificationLinkAsync(usuario.Email);

                // Enviar correo en segundo plano (fire-and-forget)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _emailService.SendEmailAsync(usuario.Email, "Verifica tu correo - EcoFuga",
                            $"Hola {usuario.Nombre},\n\nPor favor verifica tu correo con este enlace:\n{verificationLink}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error enviando correo de verificación a {Email}", usuario.Email);
                    }
                });

                usuario.FirebaseUid = userRecord.Uid;
                usuario.EmailVerificado = false;
                usuario.Contraseña = BCrypt.Net.BCrypt.HashPassword(usuario.Contraseña);
                usuario.Id ??= Guid.NewGuid().ToString();

                await _firebaseService.AddUsuarioAsync(usuario);

                return CreatedAtAction(nameof(Get), new { id = usuario.Id }, usuario);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear usuario.");
                return StatusCode(500, "Error interno del servidor.");
            }
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var usuarios = await _firebaseService.GetAllUsuariosAsync();
            return Ok(usuarios);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest loginRequest)
        {
            if (loginRequest == null || string.IsNullOrEmpty(loginRequest.Email) || string.IsNullOrEmpty(loginRequest.Contraseña))
            {
                return BadRequest(new { error = "INVALID_REQUEST", message = "Email y contraseña son requeridos." });
            }

            try
            {
                var usuario = await _firebaseService.GetUsuarioByEmailAsync(loginRequest.Email.ToLower().Trim());
                if (usuario == null)
                {
                    return Unauthorized(new { error = "USER_NOT_FOUND", message = "Usuario no encontrado." });
                }

                if (usuario.IsLockedOut)
                {
                    return Unauthorized(new { error = "ACCOUNT_LOCKED", message = "La cuenta está bloqueada temporalmente. Intente más tarde." });
                }

                bool isPasswordValid = BCrypt.Net.BCrypt.Verify(loginRequest.Contraseña, usuario.Contraseña);
                if (!isPasswordValid)
                {
                    usuario.FailedLoginAttempts++;
                    if (usuario.FailedLoginAttempts >= 5)
                    {
                        usuario.LockoutEndTime = DateTime.UtcNow.AddSeconds(30);
                    }
                    if (usuario.Id != null)
                    {
                        await _firebaseService.UpdateUsuarioAsync(usuario.Id, usuario);
                    }
                    return Unauthorized(new { error = "INVALID_CREDENTIALS", message = "Credenciales inválidas." });
                }

                var firebaseUser = await FirebaseAuth.DefaultInstance.GetUserAsync(usuario.FirebaseUid);
                if (!firebaseUser.EmailVerified)
                {
                    return Unauthorized(new { error = "EMAIL_NOT_VERIFIED", message = "El correo electrónico no ha sido verificado." });
                }

                if (!usuario.EmailVerificado)
                {
                    usuario.EmailVerificado = true;
                    if (usuario.Id != null)
                    {
                        await _firebaseService.UpdateUsuarioAsync(usuario.Id, usuario);
                    }
                }

                usuario.FailedLoginAttempts = 0;
                usuario.LockoutEndTime = null;
                if (usuario.Id != null)
                {
                    await _firebaseService.UpdateUsuarioAsync(usuario.Id, usuario);
                }

                return Ok(new { message = "Inicio de sesión exitoso." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error durante el inicio de sesión.");
                return StatusCode(500, new { error = "SERVER_ERROR", message = "Error interno del servidor." });
            }
        }
    }
}

using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BackEnd.Services
{
    public interface IEmailService
    {
        Task<bool> SendEmailAsync(string toEmail, string subject, string body);
        Task<bool> SendVerificationEmailAsync(string toEmail, string verificationLink);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var smtpConfig = _configuration.GetSection("Smtp");
                
                var portString = smtpConfig["Port"];
                if (string.IsNullOrWhiteSpace(portString))
                {
                    throw new InvalidOperationException("Falta la configuración del puerto SMTP.");
                }

                using var client = new SmtpClient(smtpConfig["Host"], int.Parse(portString))
                {
                    EnableSsl = bool.Parse(smtpConfig["EnableSsl"] ?? "true"),
                    Credentials = new NetworkCredential(smtpConfig["Username"], smtpConfig["Password"])
                };

                var fromEmail = smtpConfig["Username"];
                if (string.IsNullOrWhiteSpace(fromEmail))
                {
                    throw new InvalidOperationException("Nombre de usuario SMTP (del correo electrónico) Falta la configuración.");
                }

                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, "EcoFuga"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = false
                };

                mailMessage.To.Add(toEmail);
                
                await client.SendMailAsync(mailMessage);
                
                _logger.LogInformation("Correo electrónico enviado exitosamente a: {Email}", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al enviar correo electrónico a: {Email}", toEmail);
                return false;
            }
        }

        public async Task<bool> SendVerificationEmailAsync(string toEmail, string verificationLink)
        {
            var subject = "Verifica tu correo - Ecofuga";
            var body = $@"Hola,

Gracias por registrarte en Papelería Web. Para completar tu registro y verificar tu correo electrónico, por favor haz clic en el siguiente enlace:

{verificationLink}

Este enlace expirará en 24 horas por seguridad.

Si no has solicitado este registro, puedes ignorar este correo.

Saludos,
El equipo de EcoFuga";

            return await SendEmailAsync(toEmail, subject, body);
        }
    }
}

using BCrypt.Net;
using Google.Cloud.Firestore;
using System.ComponentModel.DataAnnotations;

namespace BackEnd.Models
{
    [FirestoreData]
    public class Usuario
    {
        [FirestoreProperty]
        public string? Id { get; set; }

    [FirestoreProperty]
    [Required(ErrorMessage = "El nombre es obligatorio")]
    [RegularExpression(@"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", ErrorMessage = "El nombre solo puede contener letras y espacios")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 50 caracteres")]
    public string? Nombre { get; set; }

    [FirestoreProperty]
    [Required(ErrorMessage = "El email es obligatorio")]
    [EmailAddress(ErrorMessage = "El email no es válido")]
    [StringLength(100, ErrorMessage = "El email no puede exceder 100 caracteres")]
    public string? Email { get; set; }

    [FirestoreProperty]
    [RegularExpression(@"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-.,#]+$", ErrorMessage = "La dirección contiene caracteres no permitidos")]
    [StringLength(200, ErrorMessage = "La dirección no puede exceder 200 caracteres")]
    public string? Direccion { get; set; }

    [FirestoreProperty]
    [RegularExpression(@"^[0-9]+$", ErrorMessage = "El teléfono solo puede contener números")]
    [StringLength(20, MinimumLength = 10, ErrorMessage = "El teléfono debe tener entre 10 y 20 caracteres")]
    public string? Telefono { get; set; }

        [FirestoreProperty]
        [Required(ErrorMessage = "La contraseña es obligatoria")]
        [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
        public string? Contraseña { get; set; }

        [FirestoreProperty]
        public string? FirebaseUid { get; set; }  
    [FirestoreProperty]
    public bool EmailVerificado { get; set; } = false;  
    [FirestoreProperty]
    public int FailedLoginAttempts { get; set; } = 0;  
    [FirestoreProperty]
    public DateTime? LockoutEndTime { get; set; }  
    [FirestoreProperty]
    public bool IsLockedOut => LockoutEndTime.HasValue && LockoutEndTime > DateTime.UtcNow;
    }
}

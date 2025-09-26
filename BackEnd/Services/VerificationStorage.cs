using System.Collections.Concurrent;

namespace PapeleriaApi.Services
{
    public static class VerificationStorage
    {
        // Almacenamiento temporal de códigos de verificación en memoria
        public static ConcurrentDictionary<string, string> Codes { get; } = new ConcurrentDictionary<string, string>();
    }
}

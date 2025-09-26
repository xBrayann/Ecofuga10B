using Google.Cloud.Firestore;
using BackEnd.Models;
using Microsoft.Extensions.Configuration;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore.V1;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public class FirebaseService
    {
        private readonly FirestoreDb _firestoreDb;
        private const string CollectionName = "Usuarios";

        public FirebaseService(IConfiguration configuration)
        {
            var firebaseConfig = configuration.GetSection("Firebase");
            var credentialsPath = firebaseConfig["CredentialsPath"];
            var projectId = firebaseConfig["ProjectId"];

            if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(credentialsPath))
                throw new InvalidOperationException("Firebase ProjectId o CredentialsPath no están configurados.");

            if (!File.Exists(credentialsPath))
                throw new FileNotFoundException($"No se encontró el archivo de credenciales: {credentialsPath}");

            // Inicializar FirebaseApp
            if (FirebaseApp.DefaultInstance == null)
            {
                using var stream = new FileStream(credentialsPath, FileMode.Open, FileAccess.Read);
                var credential = GoogleCredential.FromStream(stream);

                FirebaseApp.Create(new AppOptions
                {
                    Credential = credential,
                    ProjectId = projectId
                });

                // evitar error de variable de entorno
                var firestoreClient = new FirestoreClientBuilder
                {
                    Credential = credential
                }.Build();
                _firestoreDb = FirestoreDb.Create(projectId, firestoreClient);
            }
            else
            {
                _firestoreDb = FirestoreDb.Create(projectId);
            }
        }

        public async Task<List<Usuario>> GetAllUsuariosAsync()
        {
            var usuariosQuery = _firestoreDb.Collection(CollectionName);
            var snapshot = await usuariosQuery.GetSnapshotAsync();

            var usuarios = new List<Usuario>();
            foreach (var document in snapshot.Documents)
            {
                if (document.Exists)
                {
                    var usuario = document.ConvertTo<Usuario>();
                    usuario.Id = document.Id;
                    usuarios.Add(usuario);
                }
            }
            return usuarios;
        }


        public async Task<Usuario?> GetUsuarioByIdAsync(string id)
        {
            var docRef = _firestoreDb.Collection(CollectionName).Document(id);
            var snapshot = await docRef.GetSnapshotAsync();

            if (snapshot.Exists)
            {
                var usuario = snapshot.ConvertTo<Usuario>();
                usuario.Id = snapshot.Id;
                return usuario;
            }
            return null;
        }

        public async Task<Usuario?> GetUsuarioByEmailAsync(string email)
        {
            var query = _firestoreDb.Collection(CollectionName).WhereEqualTo("Email", email);
            var snapshot = await query.GetSnapshotAsync();

            if (snapshot.Count > 0)
            {
                var document = snapshot.Documents[0];
                var usuario = document.ConvertTo<Usuario>();
                usuario.Id = document.Id;
                return usuario;
            }
            return null;
        }


        public async Task AddUsuarioAsync(Usuario usuario)
        {
            await _firestoreDb.Collection(CollectionName).AddAsync(usuario);
        }

        public async Task UpdateUsuarioAsync(string id, Usuario usuario)
        {
            var docRef = _firestoreDb.Collection(CollectionName).Document(id);
            await docRef.SetAsync(usuario, SetOptions.Overwrite);
        }


        public async Task DeleteUsuarioAsync(string id)
        {
            var docRef = _firestoreDb.Collection(CollectionName).Document(id);
            await docRef.DeleteAsync();
        }
    }
}

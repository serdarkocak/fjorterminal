using FjorTerminal.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;
using System.Text;

namespace FjorTerminal.Infrastructure.Services
{
    public class EncryptionService : IEncryptionService
    {
        private readonly string _encryptionKey;
        private readonly byte[] _keyBytes;
        private const int KeySize = 256;
        private const int BlockSize = 128;

        public EncryptionService(IConfiguration configuration)
        {
            _encryptionKey = configuration["EncryptionSettings:Key"] 
                ?? throw new InvalidOperationException("Encryption key not configured. Please set EncryptionSettings:Key in appsettings.json");

            // Derive a 256-bit key from the encryption key using SHA256
            using var sha256 = SHA256.Create();
            _keyBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(_encryptionKey));
        }

        public string Encrypt(string plainText)
        {
            if (string.IsNullOrEmpty(plainText))
                return string.Empty;

            try
            {
                using var aes = Aes.Create();
                aes.KeySize = KeySize;
                aes.BlockSize = BlockSize;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.Key = _keyBytes;

                // Generate a random IV for each encryption
                aes.GenerateIV();
                var iv = aes.IV;

                using var encryptor = aes.CreateEncryptor();
                using var msEncrypt = new MemoryStream();
                
                // Write IV first
                msEncrypt.Write(iv, 0, iv.Length);
                
                using (var csEncrypt = new CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write))
                using (var swEncrypt = new StreamWriter(csEncrypt))
                {
                    swEncrypt.Write(plainText);
                }

                var encrypted = msEncrypt.ToArray();
                return Convert.ToBase64String(encrypted);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to encrypt data", ex);
            }
        }

        public string Decrypt(string cipherText)
        {
            if (string.IsNullOrEmpty(cipherText))
                return string.Empty;

            try
            {
                var fullCipher = Convert.FromBase64String(cipherText);

                using var aes = Aes.Create();
                aes.KeySize = KeySize;
                aes.BlockSize = BlockSize;
                aes.Mode = CipherMode.CBC;
                aes.Padding = PaddingMode.PKCS7;
                aes.Key = _keyBytes;

                // Extract IV from the beginning of the cipher text
                var iv = new byte[16];
                Array.Copy(fullCipher, 0, iv, 0, 16);
                aes.IV = iv;

                using var decryptor = aes.CreateDecryptor();
                using var msDecrypt = new MemoryStream(fullCipher, 16, fullCipher.Length - 16);
                using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
                using var srDecrypt = new StreamReader(csDecrypt);

                return srDecrypt.ReadToEnd();
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException("Failed to decrypt data", ex);
            }
        }
    }
}


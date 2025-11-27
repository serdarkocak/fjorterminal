using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;

namespace FjorTerminal.API.Controllers
{
    [ApiController]
    [Route("api/translate")]
    public class TranslationController : ControllerBase
    {
        private readonly IHttpClientFactory _clientFactory;

        public TranslationController(IHttpClientFactory clientFactory)
        {
            _clientFactory = clientFactory;
        }

        [HttpPost("deepl")]
        public async Task<IActionResult> Translate([FromForm] string text)
        {
            try
            {
                // ENV'den anahtarı al
                var apiKey = Environment.GetEnvironmentVariable("DEEPL_API_KEY");

                if (string.IsNullOrEmpty(apiKey))
                    return BadRequest(new { error = "DEEPL_API_KEY environment variable is missing on backend." });

                if (string.IsNullOrWhiteSpace(text))
                    return BadRequest(new { error = "Text cannot be empty." });

                // DeepL endpoint
                var client = _clientFactory.CreateClient();
                var url = "https://api-free.deepl.com/v2/translate";

                // Form data
                var formData = new FormUrlEncodedContent(new[]
                {
                    new KeyValuePair<string, string>("auth_key", apiKey),
                    new KeyValuePair<string, string>("text", text),
                    new KeyValuePair<string, string>("target_lang", "TR")
                });

                // API çağrısı
                var response = await client.PostAsync(url, formData);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new
                    {
                        error = "DeepL API returned an error.",
                        status = response.StatusCode,
                        response = body
                    });
                }

                // JSON döndür
                return Content(body, "application/json");
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = "Unexpected server error",
                    message = ex.Message
                });
            }
        }
    }
}

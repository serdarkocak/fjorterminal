[ApiController]
[Route("api/translate")]
public class TranslationController : ControllerBase
{
    private readonly HttpClient _httpClient;

    public TranslationController(IHttpClientFactory factory)
    {
        _httpClient = factory.CreateClient();
    }

    [HttpPost("deepl")]
    public async Task<IActionResult> Translate([FromForm] string text)
    {
        var apiKey = Environment.GetEnvironmentVariable("DEEPL_API_KEY");

        var data = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["auth_key"] = apiKey,
            ["text"] = text,
            ["target_lang"] = "TR"
        });

        var response = await _httpClient.PostAsync("https://api-free.deepl.com/v2/translate", data);
        var json = await response.Content.ReadAsStringAsync();

        return Content(json, "application/json");
    }
}

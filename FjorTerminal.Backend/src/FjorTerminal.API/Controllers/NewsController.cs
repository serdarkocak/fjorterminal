using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ServiceModel.Syndication;
using System.Xml;
using System.IO;
using System.Text.RegularExpressions;

namespace FjorTerminal.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NewsController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NewsController> _logger;

    public NewsController(IHttpClientFactory httpClientFactory, ILogger<NewsController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Fetch and parse RSS feed from any URL (bypasses CORS)
    /// </summary>
    [HttpGet("rss")]
    public async Task<IActionResult> FetchRssFeed([FromQuery] string url)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest(new { message = "RSS feed URL is required" });
            }

            _logger.LogInformation("Fetching RSS feed from: {Url}", url);

            var httpClient = _httpClientFactory.CreateClient("NewsClient");
            var response = await httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to fetch RSS feed. Status: {StatusCode}", response.StatusCode);
                return StatusCode((int)response.StatusCode, new { message = $"Failed to fetch RSS feed: {response.ReasonPhrase}" });
            }

            // Read content as string first to handle encoding issues
            var content = await response.Content.ReadAsStringAsync();
            
            // Fix RSS feed if version attribute is missing or empty (common issue with Cointelegraph)
            // Handle cases like: <rss>, <rss version="">, <rss version=''>
            if (content.Contains("<rss"))
            {
                // Find the first <rss> tag and fix it
                var rssIndex = content.IndexOf("<rss", StringComparison.OrdinalIgnoreCase);
                if (rssIndex >= 0)
                {
                    var rssEndIndex = content.IndexOf(">", rssIndex);
                    if (rssEndIndex > rssIndex)
                    {
                        var rssTag = content.Substring(rssIndex, rssEndIndex - rssIndex + 1);
                        var rssTagLower = rssTag.ToLower();
                        
                        // Check if version is missing or empty
                        if (!rssTagLower.Contains("version=\"2.0\"") && !rssTagLower.Contains("version='2.0'"))
                        {
                            // Remove any existing version attribute (empty or invalid)
                            var fixedTag = Regex.Replace(rssTag, @"\s+version\s*=\s*[""'][^""']*[""']", "", RegexOptions.IgnoreCase);
                            
                            // Add version="2.0" after <rss
                            if (fixedTag.Contains(" "))
                            {
                                // Has other attributes, add version before the first space after <rss
                                fixedTag = fixedTag.Replace("<rss ", "<rss version=\"2.0\" ");
                            }
                            else
                            {
                                // No attributes, just add version
                                fixedTag = fixedTag.Replace("<rss>", "<rss version=\"2.0\">");
                            }
                            
                            content = content.Substring(0, rssIndex) + fixedTag + content.Substring(rssEndIndex + 1);
                            _logger.LogInformation("Fixed missing or empty RSS version attribute");
                        }
                    }
                }
            }
            
            // Try to parse - first try auto-detect (more flexible), then RSS 2.0
            SyndicationFeed feed;
            try
            {
                // First try auto-detect (handles both RSS and Atom, more flexible with version)
                using var stringReader = new StringReader(content);
                using var xmlReader = XmlReader.Create(stringReader, new XmlReaderSettings
                {
                    IgnoreWhitespace = true,
                    IgnoreComments = true,
                    DtdProcessing = System.Xml.DtdProcessing.Ignore,
                    CheckCharacters = false
                });
                feed = SyndicationFeed.Load(xmlReader);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse with auto-detect, trying RSS 2.0 explicitly");
                // Fallback to RSS 2.0 explicitly
                try
                {
                    using var stringReader = new StringReader(content);
                    using var xmlReader = XmlReader.Create(stringReader, new XmlReaderSettings
                    {
                        IgnoreWhitespace = true,
                        IgnoreComments = true,
                        DtdProcessing = System.Xml.DtdProcessing.Ignore,
                        CheckCharacters = false
                    });
                    
                    var rssFormatter = new Rss20FeedFormatter();
                    rssFormatter.ReadFrom(xmlReader);
                    feed = rssFormatter.Feed;
                }
                catch (Exception ex2)
                {
                    _logger.LogError(ex2, "Failed to parse RSS feed with both methods");
                    throw;
                }
            }
            var newsItems = new List<object>();

            foreach (var item in feed.Items.Take(50)) // Limit to 50 items
            {
                newsItems.Add(new
                {
                    title = item.Title?.Text ?? string.Empty,
                    description = GetDescription(item),
                    link = item.Links.FirstOrDefault()?.Uri?.ToString() ?? string.Empty,
                    pubDate = item.PublishDate.DateTime,
                    author = GetAuthor(item),
                    category = GetCategory(item)
                });
            }

            _logger.LogInformation("Successfully fetched {Count} news items from RSS feed", newsItems.Count);

            return Ok(new
            {
                success = true,
                feedTitle = feed.Title?.Text ?? "Unknown Feed",
                feedDescription = feed.Description?.Text ?? string.Empty,
                items = newsItems,
                count = newsItems.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching RSS feed from {Url}", url);
            return StatusCode(500, new { message = "An error occurred while fetching RSS feed", error = ex.Message });
        }
    }

    /// <summary>
    /// Test RSS feed URL (validates it's a valid RSS feed)
    /// </summary>
    [HttpGet("rss/test")]
    public async Task<IActionResult> TestRssFeed([FromQuery] string url)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest(new { message = "RSS feed URL is required" });
            }

            _logger.LogInformation("Testing RSS feed: {Url}", url);

            var httpClient = _httpClientFactory.CreateClient("NewsClient");
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            var response = await httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return Ok(new
                {
                    success = false,
                    message = $"Failed to fetch RSS feed: {response.ReasonPhrase}",
                    statusCode = (int)response.StatusCode
                });
            }

            // Read content as string first to handle encoding issues
            var content = await response.Content.ReadAsStringAsync();
            
            // Fix RSS feed if version attribute is missing or empty (common issue with Cointelegraph)
            // Handle cases like: <rss>, <rss version="">, <rss version=''>
            if (content.Contains("<rss"))
            {
                // Find the first <rss> tag and fix it
                var rssIndex = content.IndexOf("<rss", StringComparison.OrdinalIgnoreCase);
                if (rssIndex >= 0)
                {
                    var rssEndIndex = content.IndexOf(">", rssIndex);
                    if (rssEndIndex > rssIndex)
                    {
                        var rssTag = content.Substring(rssIndex, rssEndIndex - rssIndex + 1);
                        var rssTagLower = rssTag.ToLower();
                        
                        // Check if version is missing or empty
                        if (!rssTagLower.Contains("version=\"2.0\"") && !rssTagLower.Contains("version='2.0'"))
                        {
                            // Remove any existing version attribute (empty or invalid)
                            var fixedTag = Regex.Replace(rssTag, @"\s+version\s*=\s*[""'][^""']*[""']", "", RegexOptions.IgnoreCase);
                            
                            // Add version="2.0" after <rss
                            if (fixedTag.Contains(" "))
                            {
                                // Has other attributes, add version before the first space after <rss
                                fixedTag = fixedTag.Replace("<rss ", "<rss version=\"2.0\" ");
                            }
                            else
                            {
                                // No attributes, just add version
                                fixedTag = fixedTag.Replace("<rss>", "<rss version=\"2.0\">");
                            }
                            
                            content = content.Substring(0, rssIndex) + fixedTag + content.Substring(rssEndIndex + 1);
                            _logger.LogInformation("Fixed missing or empty RSS version attribute");
                        }
                    }
                }
            }
            
            // Try to parse - first try auto-detect (more flexible), then RSS 2.0
            SyndicationFeed feed;
            try
            {
                // First try auto-detect (handles both RSS and Atom, more flexible with version)
                using var stringReader = new StringReader(content);
                using var xmlReader = XmlReader.Create(stringReader, new XmlReaderSettings
                {
                    IgnoreWhitespace = true,
                    IgnoreComments = true,
                    DtdProcessing = System.Xml.DtdProcessing.Ignore,
                    CheckCharacters = false
                });
                feed = SyndicationFeed.Load(xmlReader);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse with auto-detect, trying RSS 2.0 explicitly");
                // Fallback to RSS 2.0 explicitly
                try
                {
                    using var stringReader = new StringReader(content);
                    using var xmlReader = XmlReader.Create(stringReader, new XmlReaderSettings
                    {
                        IgnoreWhitespace = true,
                        IgnoreComments = true,
                        DtdProcessing = System.Xml.DtdProcessing.Ignore,
                        CheckCharacters = false
                    });
                    
                    var rssFormatter = new Rss20FeedFormatter();
                    rssFormatter.ReadFrom(xmlReader);
                    feed = rssFormatter.Feed;
                }
                catch (Exception ex2)
                {
                    _logger.LogError(ex2, "Failed to parse RSS feed with both methods");
                    throw;
                }
            }

            return Ok(new
            {
                success = true,
                message = "RSS feed is valid",
                feedTitle = feed.Title?.Text ?? "Unknown",
                feedDescription = feed.Description?.Text ?? string.Empty,
                itemCount = feed.Items.Count()
            });
        }
        catch (XmlException)
        {
            return Ok(new
            {
                success = false,
                message = "Invalid RSS feed format - not valid XML"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing RSS feed {Url}", url);
            return Ok(new
            {
                success = false,
                message = $"Error testing RSS feed: {ex.Message}"
            });
        }
    }

    private string GetDescription(SyndicationItem item)
    {
        string description = string.Empty;
        
        if (item.Summary?.Text != null)
            description = item.Summary.Text;
        else if (item.Content is TextSyndicationContent textContent)
            description = textContent.Text;

        if (string.IsNullOrEmpty(description))
            return string.Empty;

        // Remove all <img> tags and their content to prevent image downloads
        // This regex matches <img> tags with any attributes
        description = Regex.Replace(description, @"<img[^>]*>", "", RegexOptions.IgnoreCase);
        
        // Also remove <img> tags that might be self-closing or have various formats
        description = Regex.Replace(description, @"<img\s+[^>]*/?>", "", RegexOptions.IgnoreCase);

        return description;
    }

    private string GetAuthor(SyndicationItem item)
    {
        var author = item.Authors.FirstOrDefault();
        return author?.Name ?? string.Empty;
    }

    private string GetCategory(SyndicationItem item)
    {
        var category = item.Categories.FirstOrDefault();
        return category?.Name ?? string.Empty;
    }
}


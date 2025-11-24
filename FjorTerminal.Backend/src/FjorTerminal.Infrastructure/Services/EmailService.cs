using FjorTerminal.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace FjorTerminal.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> SendPasswordResetCodeAsync(string email, string resetCode)
        {
            try
            {
                var smtpHost = _configuration["EmailSettings:SmtpHost"] ?? "smtp.gmail.com";
                var smtpPortStr = _configuration["EmailSettings:SmtpPort"] ?? "587";
                
                if (!int.TryParse(smtpPortStr, out var smtpPort))
                {
                    _logger.LogWarning("Invalid SMTP port configuration: {Port}", smtpPortStr);
                    smtpPort = 587;
                }
                
                var smtpUsername = _configuration["EmailSettings:SmtpUsername"] ?? "";
                var smtpPassword = _configuration["EmailSettings:SmtpPassword"] ?? "";
                var fromEmail = _configuration["EmailSettings:FromEmail"] ?? smtpUsername;
                var fromName = _configuration["EmailSettings:FromName"] ?? "FjorTerminal";

                // If email is not configured, log and return false
                if (string.IsNullOrEmpty(smtpUsername) || string.IsNullOrEmpty(smtpPassword))
                {
                    _logger.LogWarning("Email settings not configured. Password reset code for {Email}: {Code}", email, resetCode);
                    return false;
                }

                _logger.LogInformation("Attempting to send password reset email to {Email} via {Host}:{Port}", email, smtpHost, smtpPort);

                using var client = new SmtpClient(smtpHost, smtpPort)
                {
                    EnableSsl = true,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 30000 // 30 seconds timeout
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, fromName),
                    Subject = "FjorTerminal - Password Reset",
                    Body = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }}
        .header {{
            background-color: #1a1a1a;
            padding: 20px;
            text-align: center;
        }}
        .header-text {{
            color: #ffffff;
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }}
        .content {{
            padding: 40px 30px;
            background-color: #ffffff;
        }}
        .greeting {{
            font-size: 18px;
            color: #333333;
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 16px;
            color: #666666;
            margin-bottom: 30px;
            line-height: 1.8;
        }}
        .code-container {{
            background-color: #f8f9fa;
            border: 2px dashed #10B981;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }}
        .code-label {{
            font-size: 14px;
            color: #666666;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .code {{
            font-size: 36px;
            font-weight: bold;
            color: #10B981;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
        }}
        .code-expiry {{
            font-size: 12px;
            color: #999999;
            margin-top: 10px;
        }}
        .footer {{
            padding: 30px;
            text-align: center;
            background-color: #f8f9fa;
            border-top: 1px solid #e5e5e5;
        }}
        .footer-text {{
            font-size: 14px;
            color: #666666;
            margin: 10px 0;
        }}
        .footer-signature {{
            font-size: 16px;
            color: #333333;
            margin-top: 20px;
            font-weight: 500;
        }}
        .warning {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .warning-text {{
            font-size: 13px;
            color: #856404;
            margin: 0;
        }}
    </style>
</head>
<body>
    <div class=""container"">
        <div class=""header"">
            <h1 class=""header-text"">FjorTerminal</h1>
        </div>
        <div class=""content"">
            <div class=""greeting"">
                Hi {email},
            </div>
            <div class=""message"">
                <p style=""font-size: 20px; color: #333333; margin-bottom: 15px;"">
                    <strong>It's ok to forget, we're here!</strong>
                </p>
                <p>
                    You have requested to reset your password. You can use the code below to reset your password and create a new one.
                </p>
            </div>
            <div class=""code-container"">
                <div class=""code-label"">Password Reset Code</div>
                <div class=""code"">{resetCode}</div>
                <div class=""code-expiry"">This code is valid for 15 minutes</div>
            </div>
            <div class=""warning"">
                <p class=""warning-text"">
                    <strong>⚠️ Security Warning:</strong> If you did not make this request, please ignore this email. 
                    We recommend changing your password.
                </p>
            </div>
        </div>
        <div class=""footer"">
            <p class=""footer-text"">Thank you,</p>
            <p class=""footer-signature"">The FjorTerminal Team</p>
            <p class=""footer-text"" style=""margin-top: 30px; font-size: 12px; color: #999999;"">
                © 2025 FjorTerminal. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
                    ",
                    IsBodyHtml = true
                };

                mailMessage.To.Add(email);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("Password reset code sent successfully to {Email}", email);
                return true;
            }
            catch (SmtpException smtpEx)
            {
                _logger.LogError(smtpEx, "SMTP error while sending password reset code to {Email}. Status: {Status}, Message: {Message}", 
                    email, smtpEx.StatusCode, smtpEx.Message);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send password reset code to {Email}. Error: {Error}", email, ex.Message);
                return false;
            }
        }
    }
}


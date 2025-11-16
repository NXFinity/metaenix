export function getPasswordChangedEmailTemplate(
  username: string,
  frontendUrl?: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - Meta EN|IX</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            margin: 0;
            padding: 40px 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #111827;
            color: #ffffff;
            line-height: 1.6;
          }
          .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: #1f2937;
            border-radius: 12px;
            overflow: hidden;
          }
          .header {
            background: #111827;
            padding: 40px 30px;
            text-align: center;
          }
          .logo {
            max-width: 180px;
            height: auto;
          }
          .content {
            padding: 50px 40px;
            background: #1f2937;
          }
          h1 {
            font-size: 28px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 12px;
            text-align: center;
          }
          .username {
            color: #ff3c00;
            font-weight: 700;
          }
          .message {
            font-size: 16px;
            color: #d1d5db;
            text-align: center;
            margin: 30px 0;
          }
          .cta-button {
            display: inline-block;
            background: #ff3c00;
            color: #ffffff !important;
            padding: 18px 48px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 18px;
            text-align: center;
            margin: 30px 0;
          }
          .cta-button:link,
          .cta-button:visited,
          .cta-button:hover,
          .cta-button:active {
            color: #ffffff !important;
            text-decoration: none;
          }
          .cta-container {
            text-align: center;
            margin: 40px 0;
          }
          .success-box {
            background: #111827;
            border-left: 4px solid #ff3c00;
            padding: 24px;
            border-radius: 4px;
            margin: 30px 0;
          }
          .success-box p {
            font-size: 15px;
            color: #d1d5db;
            margin: 0;
            text-align: center;
            line-height: 1.7;
          }
          .info {
            background: #111827;
            border-left: 4px solid #ff3c00;
            padding: 20px;
            border-radius: 4px;
            margin: 30px 0;
          }
          .info p {
            font-size: 14px;
            color: #d1d5db;
            margin: 0;
            text-align: center;
          }
          .warning {
            background: #111827;
            border-left: 4px solid #ff3c00;
            padding: 20px;
            border-radius: 4px;
            margin: 30px 0;
          }
          .warning p {
            font-size: 14px;
            color: #d1d5db;
            margin: 0;
            text-align: center;
          }
          .footer {
            background: #111827;
            padding: 40px;
            text-align: center;
            border-top: 1px solid #374151;
          }
          .footer-brand {
            font-size: 20px;
            font-weight: 800;
            color: #ff3c00;
            margin-bottom: 20px;
          }
          .footer-links {
            margin: 20px 0;
          }
          .footer-link {
            color: #ffffff !important;
            text-decoration: none;
            font-size: 14px;
            margin: 0 15px;
            font-weight: 500;
          }
          .footer-link:link,
          .footer-link:visited {
            color: #ffffff !important;
            text-decoration: none;
          }
          .footer-link:hover {
            color: #ff3c00 !important;
          }
          .footer-link:active {
            color: #ff3c00 !important;
          }
          .footer-copyright {
            font-size: 12px;
            color: #6b7280;
            margin-top: 24px;
          }
          @media only screen and (max-width: 600px) {
            body { padding: 20px 10px; }
            .content { padding: 40px 30px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <img src="https://metaenix.com/images/logos/logo.png" alt="Meta EN|IX" class="logo">
          </div>
          
          <div class="content">
            <h1>Password Changed Successfully</h1>
            <p class="message">Hey <span class="username">${username}</span>, your password has been successfully changed.</p>
            
            <div class="success-box">
              <p>✅ Your account password was updated. If you made this change, you're all set! If you didn't change your password, please secure your account immediately.</p>
            </div>
            
            <div class="cta-container">
              <a href="${frontendUrl || 'https://metaenix.com'}/login" class="cta-button">Login to Your Account</a>
            </div>
            
            <div class="info">
              <p>For your security, we recommend enabling two-factor authentication in your account settings.</p>
            </div>
            
            <div class="warning">
              <p>🔒 If you didn't make this change, please contact support immediately to secure your account.</p>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-brand">Meta EN|IX</div>
            <div class="footer-links">
              <a href="https://metaenix.com" class="footer-link">Website</a>
              <a href="https://discord.gg/ThCJ6mbaH8" class="footer-link">Discord</a>
              <a href="https://x.com/meta_enix" class="footer-link">Twitter</a>
              <a href="https://kick.com/metaenix" class="footer-link">Kick</a>
              <a href="https://twitch.tv/metaenix" class="footer-link">Twitch</a>
            </div>
            <p class="footer-copyright">EN|IX © 2025 EN|IX Llc. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

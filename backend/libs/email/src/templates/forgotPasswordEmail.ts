export function getForgotPasswordEmailTemplate(
  username: string,
  resetUrl: string,
  token: string,
  frontendUrl?: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Forgot Password - Meta EN|IX</title>
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
          .divider {
            text-align: center;
            margin: 40px 0;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .token-section {
            background: #111827;
            border: 2px solid #374151;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
          }
          .token-label {
            font-size: 11px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 16px;
            font-weight: 700;
          }
          .token-code {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 20px;
            font-weight: 600;
            color: #ff3c00;
            letter-spacing: 3px;
            word-break: break-all;
            margin: 20px 0;
          }
          .token-link {
            margin-top: 20px;
          }
          .token-link a {
            color: #ff3c00 !important;
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
          }
          .token-link a:link,
          .token-link a:visited,
          .token-link a:hover,
          .token-link a:active {
            color: #ff3c00 !important;
            text-decoration: none;
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
            .token-code { font-size: 18px; letter-spacing: 2px; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <img src="https://metaenix.com/images/logos/logo.png" alt="Meta EN|IX" class="logo">
          </div>
          
          <div class="content">
            <h1>Reset Your Password</h1>
            <p class="message">Hey <span class="username">${username}</span>, we received a request to reset your password. Click the button below to create a new password.</p>
            
            <div class="cta-container">
              <a href="${resetUrl}" class="cta-button">Reset Password</a>
            </div>
            
            <div class="divider">Or use code</div>
            
            <div class="token-section">
              <div class="token-label">Reset Code</div>
              <div class="token-code">${token}</div>
              <div class="token-link">
                <a href="${frontendUrl || 'https://metaenix.com'}/reset-password">Enter code here</a>
              </div>
            </div>
            
            <div class="info">
              <p>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            
            <div class="warning">
              <p>🔒 If you didn't request this password reset, please secure your account immediately and contact support.</p>
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

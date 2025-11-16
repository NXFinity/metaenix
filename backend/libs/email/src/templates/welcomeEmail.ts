export function getWelcomeEmailTemplate(
  username: string,
  frontendUrl: string,
  userId?: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Meta EN|IX</title>
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
          .quick-links {
            margin: 40px 0;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .quick-link {
            background: #111827;
            border: 2px solid #374151;
            border-radius: 8px;
            padding: 24px 16px;
            text-align: center;
            text-decoration: none;
            transition: all 0.3s;
          }
          .quick-link:hover {
            border-color: #ff3c00;
          }
          .quick-link-icon {
            font-size: 32px;
            margin-bottom: 12px;
            display: block;
          }
          .quick-link-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff !important;
            margin-bottom: 4px;
          }
          .quick-link-title:link,
          .quick-link-title:visited,
          .quick-link-title:hover,
          .quick-link-title:active {
            color: #ffffff !important;
            text-decoration: none;
          }
          .quick-link-desc {
            font-size: 12px;
            color: #9ca3af;
            margin: 0;
          }
          .info {
            background: #111827;
            border-left: 4px solid #ff3c00;
            padding: 24px;
            border-radius: 4px;
            margin: 30px 0;
          }
          .info p {
            font-size: 15px;
            color: #d1d5db;
            margin: 0;
            text-align: center;
            line-height: 1.7;
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
            .quick-links {
              grid-template-columns: 1fr;
              gap: 12px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <img src="https://metaenix.com/images/logos/logo.png" alt="Meta EN|IX" class="logo">
          </div>
          
          <div class="content">
            <h1>Welcome to Meta EN|IX!</h1>
            <p class="message">Hey <span class="username">${username}</span>, we're thrilled to have you join our community! Your account is now fully activated and ready to go.</p>
            
            <div class="cta-container">
              <a href="${frontendUrl}/login" class="cta-button">Get Started</a>
            </div>
            
            <div class="quick-links">
              <a href="${frontendUrl}/${username}" class="quick-link">
                <span class="quick-link-icon">📊</span>
                <div class="quick-link-title">Channel</div>
                <div class="quick-link-desc">View your profile</div>
              </a>
              <a href="${frontendUrl}/${username}/profile" class="quick-link">
                <span class="quick-link-icon">👤</span>
                <div class="quick-link-title">Profile</div>
                <div class="quick-link-desc">Edit your details</div>
              </a>
              <a href="${frontendUrl}/${username}/settings" class="quick-link">
                <span class="quick-link-icon">⚙️</span>
                <div class="quick-link-title">Settings</div>
                <div class="quick-link-desc">Manage preferences</div>
              </a>
            </div>
            
            <div class="info">
              <p>We're here for you every step of the way. Join our community and connect with amazing creators just like you!</p>
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

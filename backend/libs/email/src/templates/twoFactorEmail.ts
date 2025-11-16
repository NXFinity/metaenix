export function getTwoFactorEmailTemplate(
  username: string,
  backupCodes: string[],
  frontendUrl?: string,
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>2FA Enabled - Meta EN|IX</title>
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
          .backup-codes-section {
            background: #111827;
            border: 2px solid #374151;
            border-radius: 8px;
            padding: 30px;
            margin: 30px 0;
          }
          .backup-codes-title {
            font-size: 14px;
            font-weight: 700;
            color: #ffffff;
            text-align: center;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .backup-codes-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 12px;
            margin: 20px 0;
          }
          .backup-code-cell {
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 6px;
            padding: 16px;
            text-align: center;
            width: 33.33%;
            vertical-align: middle;
          }
          .backup-code {
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 17px;
            font-weight: 700;
            color: #ff3c00;
            letter-spacing: 2px;
            word-break: break-all;
            line-height: 1.3;
            margin: 0;
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
            margin: 0 0 10px 0;
            text-align: center;
          }
          .info p:last-child {
            margin-bottom: 0;
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
            .backup-code-cell {
              width: 100% !important;
              display: block !important;
              margin-bottom: 12px;
            }
            .backup-codes-table {
              border-spacing: 0;
            }
            .backup-code {
              font-size: 16px;
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
            <h1>Two-Factor Authentication Enabled</h1>
            <p class="message">Hey <span class="username">${username}</span>, two-factor authentication has been successfully enabled on your account.</p>
            
            <div class="success-box">
              <p>✅ Your account is now protected with an additional layer of security. You'll need to enter a code from your authenticator app when logging in.</p>
            </div>
            
            <div class="backup-codes-section">
              <div class="backup-codes-title">Your Backup Codes</div>
              <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-bottom: 20px;">Save these codes in a secure location. Each code can only be used once.</p>
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                ${(() => {
                  const rows: string[] = [];
                  for (let i = 0; i < backupCodes.length; i += 3) {
                    const code1 = backupCodes[i] || '';
                    const code2 = backupCodes[i + 1] || '';
                    const code3 = backupCodes[i + 2] || '';
                    rows.push(`
                      <tr>
                        <td width="33.33%" style="width: 33.33%; padding: 6px;">
                          ${code1 ? `<div style="background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 16px; text-align: center; font-family: 'Courier New', monospace; font-size: 17px; font-weight: 700; color: #ff3c00; letter-spacing: 2px;">${code1}</div>` : ''}
                        </td>
                        <td width="33.33%" style="width: 33.33%; padding: 6px;">
                          ${code2 ? `<div style="background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 16px; text-align: center; font-family: 'Courier New', monospace; font-size: 17px; font-weight: 700; color: #ff3c00; letter-spacing: 2px;">${code2}</div>` : ''}
                        </td>
                        <td width="33.33%" style="width: 33.33%; padding: 6px;">
                          ${code3 ? `<div style="background: #1f2937; border: 1px solid #374151; border-radius: 6px; padding: 16px; text-align: center; font-family: 'Courier New', monospace; font-size: 17px; font-weight: 700; color: #ff3c00; letter-spacing: 2px;">${code3}</div>` : ''}
                        </td>
                      </tr>
                    `);
                  }
                  return rows.join('');
                })()}
              </table>
            </div>
            
            <div class="info">
              <p><strong>🔐 Important:</strong> These backup codes are your only way to access your account if you lose your authenticator device.</p>
              <p style="margin-top: 12px;">Each code can only be used once. After using a code, it will no longer work.</p>
            </div>
            
            <div class="warning">
              <p>⚠️ Store these codes securely. If you lose both your authenticator device and backup codes, you may lose access to your account.</p>
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


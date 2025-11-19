# Secure Token Storage

## Overview

This module provides secure token storage for JWT access and refresh tokens, addressing the XSS vulnerability identified in BUG-001.

## Current Implementation

### Security Improvements

1. **Token Obfuscation**: Tokens are base64-encoded before storage to make them less obvious in localStorage
2. **Obfuscated Key Names**: Storage keys use short, non-obvious names (`at`, `rt`) instead of descriptive names
3. **Centralized Storage**: All token operations go through a single interface, making it easier to switch implementations
4. **Legacy Migration**: Automatically migrates tokens from old localStorage keys to new obfuscated storage

### Limitations

⚠️ **Important**: This is an **interim solution**. Full security requires httpOnly cookies, which need backend support.

**Current Security Level:**
- ✅ Tokens are obfuscated (reduces casual inspection)
- ✅ Centralized storage (easier to update)
- ⚠️ Still vulnerable to XSS (tokens accessible to JavaScript)
- ❌ Not as secure as httpOnly cookies

## Usage

```typescript
import { tokenStorage } from '@/lib/auth/token-storage';

// Store tokens
tokenStorage.setAccessToken(accessToken);
tokenStorage.setRefreshToken(refreshToken);

// Retrieve tokens
const accessToken = tokenStorage.getAccessToken();
const refreshToken = tokenStorage.getRefreshToken();

// Check if tokens exist
if (tokenStorage.hasTokens()) {
  // User is authenticated
}

// Clear tokens
tokenStorage.clearTokens();
```

## Future: httpOnly Cookies

For full security, implement httpOnly cookies:

### Backend Changes Required

1. **Set httpOnly Cookies on Login:**
   ```typescript
   // Backend login endpoint
   res.cookie('accessToken', token, {
     httpOnly: true,
     secure: true, // HTTPS only
     sameSite: 'strict',
     maxAge: 3600000, // 1 hour
   });
   ```

2. **Read Tokens from Cookies:**
   ```typescript
   // Backend JWT strategy
   jwtFromRequest: ExtractJwt.fromExtractors([
     ExtractJwt.fromAuthHeaderAsBearerToken(),
     (request) => request?.cookies?.accessToken, // Fallback to cookie
   ])
   ```

### Frontend Changes Required

1. **Enable Credentials:**
   ```typescript
   // lib/api/client.ts
   const apiClient = axios.create({
     baseURL: API_URL,
     withCredentials: true, // Enable cookie sending
   });
   ```

2. **Switch Storage Type:**
   ```env
   # .env.local
   NEXT_PUBLIC_TOKEN_STORAGE_TYPE=cookies
   ```

3. **Update Token Storage:**
   - Implement `CookieTokenStorage` class
   - Tokens will be automatically sent by browser
   - No client-side token management needed

## Security Recommendations

### Immediate Actions

1. ✅ **Implemented**: Token obfuscation
2. ✅ **Implemented**: Centralized storage
3. ⚠️ **Pending**: Add Content Security Policy (CSP) headers
4. ⚠️ **Pending**: Implement XSS protection
5. ⚠️ **Pending**: Regular security audits

### Long-term Actions

1. **Implement httpOnly Cookies** (requires backend changes)
2. **Add Token Rotation**: Rotate tokens periodically
3. **Add Token Encryption**: Full encryption instead of obfuscation
4. **Add Token Expiration Monitoring**: Warn users before token expiration

## Migration

The system automatically migrates legacy tokens on app load. Old tokens stored in `localStorage` with keys `accessToken` and `refreshToken` are automatically migrated to the new obfuscated storage.

## Testing

When testing token storage:

1. **Check localStorage**: Tokens should be obfuscated (base64-encoded)
2. **Verify Migration**: Old tokens should be migrated automatically
3. **Test Clear**: `clearTokens()` should remove all token data
4. **Test Errors**: Invalid tokens should be cleared automatically

## Related Issues

- **BUG-001**: Token Storage XSS Vulnerability (this fix addresses it partially)
- **BUG-005**: No Token Refresh Mechanism (should be implemented alongside this)

## Notes

- Token obfuscation is NOT encryption - it's just base64 encoding
- For production, consider implementing proper encryption
- Full security requires httpOnly cookies
- This solution reduces but does not eliminate XSS risk


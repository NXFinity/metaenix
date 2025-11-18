# Backend Changelog - 17/11/2025 (Version 1.4.3)

**Date:** 17/11/2025  
**Year:** 2025  
**Version:** 1.4.0 → 1.4.3

---

## Security & Access Control Updates

### Private Profile Access Control

**Time:** 17/11/2025

- **Changed:** Private profile access logic updated to align with friends-only model
- **Previous Behavior:** Private profiles were accessible to users who followed the profile owner
- **New Behavior:** Private profiles are only accessible to:
  - The profile owner (always)
  - Friends (not yet implemented - coming soon)
- **Impact:** Private profiles are now truly private until friends functionality is implemented
- **Files Modified:**
  - `backend/src/rest/api/users/users.service.ts` - Updated `findByUsername()` method
- **Error Message:** Updated to: "This profile is private. Only friends can view private profiles."
- **Breaking Change:** Users who previously could view private profiles by following will no longer have access

---

### Developer Portal Access Restriction

**Time:** 17/11/2025

- **Changed:** Developer portal and OAuth authorization endpoints restricted to Administrators only
- **Reason:** Developer system is still under development and should remain in controlled environment
- **Restricted Endpoints:**
  - All `/v1/developer/*` endpoints (entire DeveloperController)
  - `GET /v1/oauth/authorize` (OAuth authorization endpoint)
- **Note:** Other OAuth endpoints (`/token`, `/revoke`, `/introspect`) remain public as per OAuth 2.0 specification
- **Files Modified:**
  - `backend/src/security/developer/developer.controller.ts` - Added `@UseGuards(AuthGuard, AdminGuard)` at controller level
  - `backend/src/security/developer/services/oauth/oauth.controller.ts` - Added `@UseGuards(AuthGuard, AdminGuard)` at controller level
- **Impact:** Only users with Administrator role can access developer portal and create OAuth applications
- **Future:** Access will be expanded once developer system is fully built and tested

---

## Developer System Improvements

### Administrator Role Bypass for Developer Registration

**Time:** 17/11/2025

- **Added:** Administrator role bypass for 30-day account age requirement
- **Behavior:** Users with `Administrator` role automatically pass the account age check
- **Rationale:** Administrators should have immediate access to developer features for platform management
- **Files Modified:**
  - `backend/src/security/developer/developer.service.ts` - Updated `checkDeveloperRequirements()` method
- **Implementation:**
  - Added `ROLE.Administrator` enum comparison check
  - `accountAge` requirement automatically set to `true` for Administrators
  - Account age error message only shown for non-Administrator users
- **Impact:** Administrators can register as developers immediately without waiting 30 days

---

### OAuth Scope Management Enhancements

**Time:** 17/11/2025

#### Improved Error Messages

- **Added:** Detailed error messages for invalid or unapproved OAuth scopes
- **Error Format:** Includes:
  - Requested scopes
  - Approved scopes for the application
  - Unapproved scopes
  - Actionable guidance message
- **Example Error:**
  ```
  No approved scopes found. Requested scopes: read:profile. 
  Approved scopes for this application: none. 
  Unapproved scopes: read:profile. 
  Please update your application to include the requested scopes.
  ```
- **Files Modified:**
  - `backend/src/security/developer/services/oauth/oauth.service.ts` - Enhanced `authorize()` method error handling
- **Impact:** Better developer experience with clear error messages for scope issues

#### Auto-Assignment of Default Scopes

- **Added:** Automatic assignment of default scopes when creating or updating applications
- **Behavior:**
  - If no scopes provided during application creation, default scopes are automatically assigned
  - If empty scope array provided during application update, default scopes are assigned
  - Default scopes are auto-approved (no admin approval required)
- **Default Scopes:** Includes `read:profile` and other essential scopes
- **Files Modified:**
  - `backend/src/security/developer/developer.service.ts`:
    - Updated `createApplication()` method
    - Updated `updateApplication()` method
- **Impact:** New applications automatically have basic scopes enabled, reducing setup friction

---

## User Profile Privacy Improvements

### Optimized Privacy Check Performance

**Time:** 17/11/2025

- **Improved:** Privacy check now performs lightweight query first before expensive full user fetch
- **Optimization:**
  - Early privacy check using minimal fields (`id`, `username`, `displayName`, `isPublic`, `privacy.isFollowerOnly`)
  - Full user data only fetched if privacy check passes
  - Fail-fast behavior for private profiles (immediate 403 response)
- **Files Modified:**
  - `backend/src/rest/api/users/users.service.ts` - Refactored `findByUsername()` method
- **Impact:** Faster response times for private profile requests, reduced database load

---

## Code Quality Improvements

### Type Safety Enhancements

- **Improved:** Better type checking for Administrator role comparison
- **Files Modified:**
  - `backend/src/security/developer/developer.service.ts` - Uses `ROLE.Administrator` enum instead of string literal
- **Impact:** Prevents typos and improves maintainability

---

## API Changes

### Modified Endpoints

#### `GET /v1/users/username/:username`

- **Changed:** Privacy access logic
- **Previous:** Private profiles accessible to followers
- **Current:** Private profiles only accessible to owner (friends coming soon)
- **Response:** 403 Forbidden with message: "This profile is private. Only friends can view private profiles."

#### `GET /v1/developer/*` (All endpoints)

- **Changed:** Access restricted to Administrators only
- **Previous:** Accessible to all authenticated developers
- **Current:** Requires `Administrator` role
- **Response:** 403 Forbidden for non-Administrator users

#### `GET /v1/oauth/authorize`

- **Changed:** Access restricted to Administrators only
- **Previous:** Accessible to all authenticated users
- **Current:** Requires `Administrator` role
- **Response:** 403 Forbidden for non-Administrator users

---

## Database Schema Changes

**None** - No database schema changes in this release.

---

## Migration Guide

### For Administrators

1. **Developer Portal Access:**
   - Only users with `Administrator` role can access developer portal
   - Non-Administrator developers will receive 403 Forbidden errors
   - This is temporary until developer system is fully built

2. **OAuth Authorization:**
   - Only Administrators can authorize OAuth applications
   - This restriction will be removed once developer system is complete

### For Developers

1. **Private Profiles:**
   - Private profiles are now only accessible to friends (not yet implemented)
   - Following a user no longer grants access to their private profile
   - Wait for friends functionality to be implemented

2. **OAuth Scope Errors:**
   - Error messages now provide detailed information about scope issues
   - Check error message for approved vs requested scopes
   - Update your application to include required scopes

3. **Default Scopes:**
   - New applications automatically receive default scopes
   - No need to manually specify scopes during creation (optional)
   - Default scopes include `read:profile` and other essential permissions

---

## Breaking Changes

### Private Profile Access

- **Breaking:** Users who previously could view private profiles by following will no longer have access
- **Impact:** Private profiles are now truly private (only owner can view until friends feature is implemented)
- **Migration:** Wait for friends functionality to be implemented for friend-based access

### Developer Portal Access

- **Breaking:** Non-Administrator users can no longer access developer portal
- **Impact:** Only Administrators can create and manage OAuth applications
- **Migration:** This is temporary - access will be restored once developer system is complete

---

## Deprecations

**None** - No features deprecated in this release.

---

## Bug Fixes

### Developer Registration

- **Fixed:** Administrator role bypass for 30-day account age requirement
- **Issue:** Administrators were incorrectly required to wait 30 days before registering as developers
- **Resolution:** Administrators now automatically pass account age check

### OAuth Scope Errors

- **Fixed:** Improved error messages for invalid or unapproved scopes
- **Issue:** Error messages were generic and didn't provide actionable information
- **Resolution:** Error messages now include requested scopes, approved scopes, and guidance

### Application Scope Management

- **Fixed:** Applications created without scopes now automatically receive default scopes
- **Issue:** Applications without scopes couldn't be used for OAuth authorization
- **Resolution:** Default scopes are automatically assigned if none provided

---

## Known Issues

**None** - All reported issues have been addressed.

---

## Future Enhancements

- **Friends System:** Implementation of friends functionality to enable friend-based private profile access
- **Developer Portal Expansion:** Restore access to non-Administrator developers once system is complete
- **Scope Approval Workflow:** Admin approval workflow for production application scopes

---

## Summary

### Statistics
- **Files Modified:** 4
- **Security Enhancements:** 2
- **Access Control Changes:** 2
- **Developer System Improvements:** 3
- **Performance Optimizations:** 1
- **Breaking Changes:** 2

### Verification
- ✅ Private profile access control updated
- ✅ Developer portal access restricted to Administrators
- ✅ Administrator role bypass implemented
- ✅ OAuth scope management improved
- ✅ Privacy check performance optimized
- ✅ All changes tested and verified

### Key Achievements
- ✅ Enhanced security with Administrator-only developer portal
- ✅ Improved developer experience with better error messages
- ✅ Optimized privacy check performance
- ✅ Aligned private profile access with friends model

---

**Note:** All date/time stamps are in UK/EU format (DD/MM/YYYY)


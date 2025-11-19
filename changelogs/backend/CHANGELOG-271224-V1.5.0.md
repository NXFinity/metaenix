# Backend Changelog - 27/12/2024 (Version 1.5.0)

**Date:** 27/12/2024  
**Year:** 2024  
**Version:** 1.4.4 → 1.5.0

---

## Major Features

This release introduces a comprehensive notifications system, post view tracking, enhanced comment functionality, and significant improvements to the event-driven architecture.

---

## New Features

### Notifications System

**Time:** 27/12/2024

- **Added:** Complete notifications system with event-driven architecture
- **Features:**
  - Persistent notification storage in database
  - Event-driven notification creation (decoupled from feature services)
  - Support for multiple notification types:
    - `follow` - User followed another user
    - `unfollow` - User unfollowed another user
    - `post_like` - Post was liked
    - `post_comment` - Comment was added to a post
    - `post_share` - Post was shared
    - `comment_like` - Comment was liked
    - `comment_reply` - Reply was added to a comment
    - `system` - System notifications
    - `welcome` - Welcome notifications
    - `verification` - Email verification notifications
  - Soft delete support for notifications
  - Comprehensive filtering and pagination
  - Read/unread status tracking
  - Action URLs for navigation
  - Related entity tracking (users, posts, comments)
  - Redis caching integration
  - Comprehensive logging and error handling

- **Architecture:**
  - Event-driven: Feature services (FollowsService, PostsService) emit events
  - NotificationsService listens to events via `@OnEvent` decorators
  - Decoupled design: Feature services don't directly depend on NotificationsService
  - Automatic notification creation on:
    - User follows/unfollows
    - Post likes
    - Post comments
    - Post shares
    - Comment likes

- **API Endpoints:**
  - `GET /v1/notifications` - Get paginated notifications (filterable by type, read status)
  - `GET /v1/notifications/unread/count` - Get unread notification count
  - `GET /v1/notifications/:id` - Get single notification
  - `PATCH /v1/notifications/:id` - Update notification (e.g., mark as read)
  - `PATCH /v1/notifications/mark-all-read` - Mark multiple notifications as read
  - `DELETE /v1/notifications/:id` - Delete a notification (soft delete)
  - `DELETE /v1/notifications/read/all` - Delete all read notifications

- **Database Schema:**
  - New `notification` table in `account` schema
  - Indexes on `userId`, `isRead`, `type`, `dateCreated` for performance
  - Foreign key to `user` table with CASCADE delete
  - JSONB metadata field for flexible data storage

- **Files Created:**
  - `backend/src/rest/api/notificaitons/notificaitons.module.ts`
  - `backend/src/rest/api/notificaitons/notificaitons.service.ts`
  - `backend/src/rest/api/notificaitons/notificaitons.controller.ts`
  - `backend/src/rest/api/notificaitons/assets/entities/notification.entity.ts`
  - `backend/src/rest/api/notificaitons/assets/enum/notification-type.enum.ts`
  - `backend/src/rest/api/notificaitons/assets/dto/create-notification.dto.ts`
  - `backend/src/rest/api/notificaitons/assets/dto/update-notification.dto.ts`
  - `backend/src/rest/api/notificaitons/assets/dto/mark-all-read.dto.ts`
  - `backend/migrations/create-notification-table.sql`

- **Files Modified:**
  - `backend/src/app.module.ts` - Added NotificationsModule import
  - `backend/src/rest/api/users/services/follows/follows.service.ts` - Emits `user.followed` and `user.unfollowed` events
  - `backend/src/rest/api/users/services/follows/follows.gateway.ts` - Removed direct notification persistence, only emits WebSocket events
  - `backend/src/rest/api/users/services/posts/posts.service.ts` - Emits `post.liked`, `post.commented`, `post.shared`, `comment.liked` events

- **Impact:**
  - Users receive real-time notifications for social interactions
  - Notifications are persisted for historical access
  - Scalable event-driven architecture
  - Easy to add new notification types in the future

---

### Post View Tracking

**Time:** 27/12/2024

- **Added:** Post view tracking endpoint and functionality
- **Features:**
  - New endpoint: `POST /v1/posts/:postId/view`
  - Atomic increment of `viewsCount` using database increment
  - Public endpoint (no authentication required, but respects scopes)
  - Automatic cache invalidation
  - Non-blocking view tracking in `findOne()` method

- **Implementation:**
  - `trackPostView()` method in PostsService
  - Uses TypeORM's `increment()` for atomic updates
  - Invalidates post cache after update
  - Called automatically when viewing a post (if public and not draft)

- **Files Modified:**
  - `backend/src/rest/api/users/services/posts/posts.controller.ts`
    - Added `POST /posts/:postId/view` endpoint
  - `backend/src/rest/api/users/services/posts/posts.service.ts`
    - Added `trackPostView()` method
    - Integrated view tracking into `findOne()` method

- **Impact:**
  - Accurate post view statistics
  - Analytics can track post popularity
  - Non-blocking view tracking doesn't slow down post retrieval

---

### Comment Detail Endpoint

**Time:** 27/12/2024

- **Added:** New endpoint to fetch a single comment by ID
- **Features:**
  - New endpoint: `GET /v1/posts/comments/:commentId`
  - Returns comment with user, post, and like status
  - Includes serialized dates and `isLiked` property
  - Proper error handling for not found comments

- **Implementation:**
  - `findCommentById()` method in PostsService
  - Fetches comment with relations (user, post)
  - Checks if current user has liked the comment
  - Returns serialized data with proper types

- **Files Modified:**
  - `backend/src/rest/api/users/services/posts/posts.controller.ts`
    - Added `GET /posts/comments/:commentId` endpoint
    - Route ordering adjusted to ensure correct matching
  - `backend/src/rest/api/users/services/posts/posts.service.ts`
    - Added `findCommentById()` method

- **Impact:**
  - Frontend can fetch individual comments directly
  - Enables comment detail pages
  - Better navigation from notifications

---

## Bug Fixes

### Soft Delete Query Fixes

**Time:** 27/12/2024

- **Fixed:** Incorrect soft delete queries using `null` instead of `IsNull()`
- **Previous Issue:**
  - TypeORM queries using `dateDeleted: null` don't work correctly
  - Soft-deleted records were still appearing in results
  - Notifications and follows queries were returning deleted records

- **Solution Implemented:**
  - Replaced all `dateDeleted: null` with `dateDeleted: IsNull()` in TypeORM queries
  - Updated `softDelete()` and `softRemove()` methods to use query builder with `dateDeleted IS NULL` filters
  - Ensured all queries filter out soft-deleted records

- **Files Modified:**
  - `backend/src/rest/api/notificaitons/notificaitons.service.ts`
    - `getNotifications()` - Added `.andWhere('notification.dateDeleted IS NULL')`
    - `getUnreadCount()` - Changed to use `dateDeleted: IsNull()`
    - `getNotificationById()` - Changed to use `dateDeleted: IsNull()`
    - `markAllAsRead()` - Changed to use `dateDeleted: IsNull()`
    - `deleteNotification()` - Changed from `remove()` to `softRemove()`
    - `deleteAllRead()` - Changed from hard `delete()` to `softDelete()` with `dateDeleted IS NULL` filter
  - `backend/src/rest/api/users/services/follows/follows.service.ts`
    - `followUser()` - Changed to filter by `dateDeleted: IsNull()`
    - `unfollowUser()` - Changed to filter by `dateDeleted: IsNull()`
    - `isFollowing()` - Changed to filter by `dateDeleted: IsNull()`
    - `batchFollowStatus()` - Changed to filter by `dateDeleted: IsNull()`

- **Impact:**
  - Soft-deleted notifications no longer appear in queries
  - Soft-deleted follows no longer affect follow status checks
  - Data integrity maintained
  - Proper cleanup of deleted records

---

## Architecture Improvements

### Event-Driven Notification Architecture

**Time:** 27/12/2024

- **Refactored:** Notification persistence moved to event-driven architecture
- **Previous Architecture:**
  - Feature services (FollowsService, PostsService) directly called NotificationsService
  - Tight coupling between features and notifications
  - Difficult to add new notification types

- **New Architecture:**
  - Feature services emit events using `EventEmitter2`
  - NotificationsService listens to events via `@OnEvent` decorators
  - Decoupled design: Features don't depend on NotificationsService
  - Easy to add new notification types by adding event listeners

- **Events Emitted:**
  - `user.followed` - Emitted when a user follows another user
  - `user.unfollowed` - Emitted when a user unfollows another user
  - `post.liked` - Emitted when a post is liked
  - `post.commented` - Emitted when a comment is added to a post
  - `post.shared` - Emitted when a post is shared
  - `comment.liked` - Emitted when a comment is liked

- **Event Handlers:**
  - `@OnEvent('user.followed')` - Creates follow notification
  - `@OnEvent('post.liked')` - Creates post like notification
  - `@OnEvent('post.commented')` - Creates post comment notification
  - `@OnEvent('post.shared')` - Creates post share notification
  - `@OnEvent('comment.liked')` - Creates comment like notification

- **Files Modified:**
  - `backend/src/rest/api/users/services/follows/follows.service.ts`
    - Emits `user.followed` and `user.unfollowed` events
    - Removed direct NotificationsService dependency
  - `backend/src/rest/api/users/services/follows/follows.gateway.ts`
    - Removed NotificationsService dependency
    - Only emits WebSocket events (real-time alerts)
    - Comments updated to clarify persistence is handled by NotificationsService
  - `backend/src/rest/api/users/services/follows/follows.module.ts`
    - Removed NotificationsModule import and forwardRef
  - `backend/src/rest/api/users/services/posts/posts.service.ts`
    - Emits `post.liked`, `post.commented`, `post.shared`, `comment.liked` events
    - Fetches user and post relations for event payloads
  - `backend/src/rest/api/notificaitons/notificaitons.service.ts`
    - Added event listeners using `@OnEvent` decorators
    - Handles notification creation from events

- **Impact:**
  - Better separation of concerns
  - Easier to test and maintain
  - Scalable architecture for adding new notification types
  - Feature services focus on their core functionality

---

## Database Schema Changes

### Notification Table

**Time:** 27/12/2024

- **Added:** New `notification` table in `account` schema
- **Table Structure:**
  ```sql
  CREATE TABLE "account"."notification" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "dateCreated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateUpdated" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateDeleted" TIMESTAMP WITH TIME ZONE,
    "userId" uuid NOT NULL,
    "type" "account"."notification_type_enum" NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" text,
    "metadata" jsonb,
    "relatedUserId" character varying(255),
    "relatedPostId" character varying(255),
    "relatedCommentId" character varying(255),
    "isRead" boolean NOT NULL DEFAULT false,
    "readAt" TIMESTAMP WITH TIME ZONE,
    "actionUrl" character varying(500),
    CONSTRAINT "PK_32a4c50c65923056587a052b3a1" PRIMARY KEY ("id")
  );
  ```

- **Indexes:**
  - `IDX_notification_userId_dateCreated` - For user notification queries sorted by date
  - `IDX_notification_userId_isRead` - For unread count queries
  - `IDX_notification_userId_isRead_dateCreated` - For filtered notification queries
  - `IDX_notification_type_dateCreated` - For type-based queries

- **Foreign Keys:**
  - `FK_notification_userId` - References `account.user(id)` with CASCADE delete

- **Enum Type:**
  - `notification_type_enum` - Defines all notification types

- **Migration File:**
  - `backend/migrations/create-notification-table.sql`

- **Impact:**
  - Efficient queries with proper indexing
  - Fast unread count retrieval
  - Scalable for millions of notifications

---

## API Changes

### New Endpoints

1. **Notifications API:**
   - `GET /v1/notifications` - Get paginated notifications
   - `GET /v1/notifications/unread/count` - Get unread count
   - `GET /v1/notifications/:id` - Get single notification
   - `PATCH /v1/notifications/:id` - Update notification
   - `PATCH /v1/notifications/mark-all-read` - Mark all as read
   - `DELETE /v1/notifications/:id` - Delete notification
   - `DELETE /v1/notifications/read/all` - Delete all read notifications

2. **Posts API:**
   - `POST /v1/posts/:postId/view` - Track post view
   - `GET /v1/posts/comments/:commentId` - Get comment by ID

### Breaking Changes

**None** - All new endpoints are additive. Existing endpoints remain unchanged.

---

## Code Quality Improvements

### Event-Driven Architecture

- **Improved:** Separation of concerns with event-driven notification system
- **Impact:** Better maintainability and testability

### Error Handling

- **Enhanced:** Comprehensive error handling in NotificationsService
- **Added:** Detailed logging for notification creation and errors
- **Impact:** Better observability and debugging

### Type Safety

- **Maintained:** Full TypeScript strict mode compliance
- **Added:** Proper types for notification DTOs and entities
- **Impact:** Type-safe notification handling

---

## Performance Improvements

### Notification Queries

- **Optimized:** Indexed queries for user notifications
- **Added:** Composite indexes for common query patterns
- **Impact:** Fast notification retrieval even with millions of records

### View Tracking

- **Optimized:** Atomic increment for view counts
- **Non-blocking:** View tracking doesn't block post retrieval
- **Impact:** Fast post loading with accurate view counts

---

## Security Enhancements

### Input Validation

- **Maintained:** Comprehensive validation on all notification DTOs
- **Added:** Validation for notification type, title, message, and related IDs
- **Impact:** Prevents invalid notification data

### Authorization

- **Added:** Scope-based authorization for notification endpoints
- **Required Scopes:**
  - `read:notifications` - For reading notifications
  - `write:notifications` - For updating/deleting notifications
- **Impact:** Proper access control for notification operations

---

## Migration Guide

### Database Migration Required

1. **Run Notification Table Migration:**
   ```sql
   -- Execute: backend/migrations/create-notification-table.sql
   ```
   - Creates `notification` table
   - Creates `notification_type_enum` type
   - Creates indexes for performance
   - Adds foreign key constraint

2. **No Data Migration Required:**
   - New feature, no existing data to migrate

### Code Updates

1. **Module Imports:**
   - `NotificationsModule` is already imported in `AppModule`
   - No additional imports required

2. **Event Emitter:**
   - `EventEmitterModule` is already configured globally
   - Feature services can emit events without additional setup

3. **Environment Variables:**
   - No new environment variables required

---

## Breaking Changes

**None** - All changes are backward compatible. New endpoints are additive.

---

## Deprecations

**None** - No features deprecated in this release.

---

## Bug Fixes

### Critical Fixes

1. **Soft Delete Queries (Notifications)**
   - Fixed queries to use `IsNull()` instead of `null`
   - Soft-deleted notifications no longer appear in results
   - Status: ✅ **RESOLVED**

2. **Soft Delete Queries (Follows)**
   - Fixed queries to use `IsNull()` instead of `null`
   - Soft-deleted follows no longer affect status checks
   - Status: ✅ **RESOLVED**

---

## Known Issues

**None** - All identified issues have been resolved.

---

## Future Enhancements

- **Notification Preferences:** Allow users to configure which notifications they receive
- **Notification Batching:** Batch multiple notifications of the same type
- **Push Notifications:** Add push notification support for mobile apps
- **Email Notifications:** Send email notifications for important events
- **Notification Templates:** Customizable notification templates
- **Notification Analytics:** Track notification engagement and click-through rates

---

## Summary

### Statistics
- **Version:** 1.4.4 → 1.5.0
- **Files Created:** 9 new files
- **Files Modified:** 8 files
- **New Endpoints:** 9 endpoints
- **New Features:** 3 major features
- **Bug Fixes:** 2 critical fixes
- **Database Changes:** 1 new table, 4 indexes

### Verification
- ✅ Notifications system fully implemented
- ✅ Event-driven architecture working correctly
- ✅ Post view tracking functional
- ✅ Comment detail endpoint working
- ✅ Soft delete queries fixed
- ✅ All tests passing
- ✅ Production ready

### Key Achievements
- ✅ **Notifications:** Complete notification system with event-driven architecture
- ✅ **View Tracking:** Accurate post view statistics
- ✅ **Comment Details:** Direct comment access for better UX
- ✅ **Architecture:** Improved separation of concerns with events
- ✅ **Data Integrity:** Fixed soft delete queries across services
- ✅ **Performance:** Optimized queries with proper indexing

### Feature Status Summary
- **New Features:** 3 (Notifications, View Tracking, Comment Details)
- **Bug Fixes:** 2 (Soft Delete Queries)
- **Architecture Improvements:** 1 (Event-Driven Notifications)
- **Database Changes:** 1 (Notification Table)

---

**Note:** All date/time stamps are in UK/EU format (DD/MM/YYYY)


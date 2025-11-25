/**
 * Utility functions for generating and parsing slugs
 */

/**
 * Generate a URL-friendly slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Get the video slug for URL (uses slug from video object if available, otherwise generates from title)
 * @param video - The video object with slug and title
 * @returns The video slug for use in URLs
 */
export const getVideoSlug = (video: { slug?: string | null; title: string }): string => {
  // If slug exists, use it; otherwise generate from title
  // For existing videos without slugs, we'll use the ID as fallback until backend generates slug
  return video.slug || generateSlug(video.title);
};

/**
 * Get the photo slug for URL (uses slug from photo object if available, otherwise generates from title)
 * @param photo - The photo object with slug and title
 * @returns The photo slug for use in URLs
 */
export const getPhotoSlug = (photo: { slug?: string | null; title: string }): string => {
  // If slug exists, use it; otherwise generate from title
  // For existing photos without slugs, we'll use the ID as fallback until backend generates slug
  return photo.slug || generateSlug(photo.title);
};


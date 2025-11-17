import { apiClient } from '@/lib/api/client';
import { STORAGE_ENDPOINTS } from './storage.endpoints';
import type {
  UploadFileRequest,
  UploadFileResponse,
  DeleteFileResponse,
  PresignedUrlRequest,
  PresignedUrlResponse,
} from './types/storage.type';

/**
 * Storage Service
 * 
 * Handles all storage-related API calls including:
 * - Uploading files to Digital Ocean Spaces
 * - Deleting files
 * - Generating presigned URLs for temporary file access
 */
export const storageService = {
  /**
   * Upload a file to Digital Ocean Spaces
   * @param data - File upload data
   * @returns Upload response with URL and metadata
   */
  async upload(data: UploadFileRequest): Promise<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('storageType', data.storageType);
    
    if (data.subType) {
      formData.append('subType', data.subType);
    }
    
    if (data.filename) {
      formData.append('filename', data.filename);
    }

    const response = await apiClient.post<UploadFileResponse>(
      STORAGE_ENDPOINTS.UPLOAD,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Delete a file from Digital Ocean Spaces
   * @param fileKey - File key/path in storage (URL encoded)
   * @returns Deletion confirmation
   */
  async delete(fileKey: string): Promise<DeleteFileResponse> {
    const response = await apiClient.delete<DeleteFileResponse>(
      STORAGE_ENDPOINTS.DELETE(fileKey),
    );
    return response.data;
  },

  /**
   * Get a presigned URL for temporary file access
   * @param data - Presigned URL request data
   * @returns Presigned URL response
   */
  async getPresignedUrl(
    data: PresignedUrlRequest,
  ): Promise<PresignedUrlResponse> {
    const response = await apiClient.post<PresignedUrlResponse>(
      STORAGE_ENDPOINTS.PRESIGNED_URL,
      data,
    );
    return response.data;
  },
};


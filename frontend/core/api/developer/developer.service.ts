import { apiClient } from '@/lib/api/client';
import { DEVELOPER_ENDPOINTS } from './developer.endpoints';
import type {
  DeveloperStatus,
  RegisterDeveloperRequest,
  RegisterDeveloperResponse,
  Application,
  CreateApplicationRequest,
  CreateApplicationResponse,
  UpdateApplicationRequest,
  UpdateApplicationResponse,
  RegenerateSecretResponse,
  DeleteApplicationResponse,
} from './types/developer.type';

/**
 * Developer Service
 * 
 * Handles all developer-related API calls including:
 * - Developer registration and status checks
 * - Application management (CRUD)
 * - Client secret regeneration
 */
export const developerService = {
  /**
   * Check developer status and requirements
   * @returns Developer status and requirements check
   */
  async getStatus(): Promise<DeveloperStatus> {
    const response = await apiClient.get<DeveloperStatus>(
      DEVELOPER_ENDPOINTS.STATUS,
    );
    return response.data;
  },

  /**
   * Register as developer
   * @param data - Registration data (acceptTerms)
   * @returns Registration response
   */
  async register(
    data: RegisterDeveloperRequest,
  ): Promise<RegisterDeveloperResponse> {
    const response = await apiClient.post<RegisterDeveloperResponse>(
      DEVELOPER_ENDPOINTS.REGISTER,
      data,
    );
    return response.data;
  },

  /**
   * List all applications for the current developer
   * @returns Array of applications (max 2)
   */
  async getApplications(): Promise<Application[]> {
    const response = await apiClient.get<Application[]>(
      DEVELOPER_ENDPOINTS.GET_APPLICATIONS,
    );
    return response.data;
  },

  /**
   * Get production application
   * @returns Production application
   */
  async getProductionApplication(): Promise<Application> {
    const response = await apiClient.get<Application>(
      DEVELOPER_ENDPOINTS.GET_PRODUCTION_APP,
    );
    return response.data;
  },

  /**
   * Get development application
   * @returns Development application
   */
  async getDevelopmentApplication(): Promise<Application> {
    const response = await apiClient.get<Application>(
      DEVELOPER_ENDPOINTS.GET_DEVELOPMENT_APP,
    );
    return response.data;
  },

  /**
   * Create a new application
   * @param data - Application creation data
   * @returns Created application with client secret (shown only once)
   */
  async createApplication(
    data: CreateApplicationRequest,
  ): Promise<CreateApplicationResponse> {
    const response = await apiClient.post<CreateApplicationResponse>(
      DEVELOPER_ENDPOINTS.CREATE_APPLICATION,
      data,
    );
    return response.data;
  },

  /**
   * Get application details by ID
   * @param id - Application ID
   * @returns Application details
   */
  async getApplication(id: string): Promise<Application> {
    const response = await apiClient.get<Application>(
      DEVELOPER_ENDPOINTS.GET_APPLICATION(id),
    );
    return response.data;
  },

  /**
   * Update an application
   * @param id - Application ID
   * @param data - Application update data
   * @returns Updated application
   */
  async updateApplication(
    id: string,
    data: UpdateApplicationRequest,
  ): Promise<UpdateApplicationResponse> {
    const response = await apiClient.patch<UpdateApplicationResponse>(
      DEVELOPER_ENDPOINTS.UPDATE_APPLICATION(id),
      data,
    );
    return response.data;
  },

  /**
   * Delete an application
   * @param id - Application ID
   * @returns Deletion confirmation
   */
  async deleteApplication(id: string): Promise<DeleteApplicationResponse> {
    const response = await apiClient.delete<DeleteApplicationResponse>(
      DEVELOPER_ENDPOINTS.DELETE_APPLICATION(id),
    );
    return response.data;
  },

  /**
   * Regenerate client secret for an application
   * @param id - Application ID
   * @returns New client secret (shown only once)
   */
  async regenerateSecret(id: string): Promise<RegenerateSecretResponse> {
    const response = await apiClient.post<RegenerateSecretResponse>(
      DEVELOPER_ENDPOINTS.REGENERATE_SECRET(id),
    );
    return response.data;
  },
};


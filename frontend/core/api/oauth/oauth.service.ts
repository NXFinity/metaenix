import { apiClient } from '@/lib/api/client';
import { OAUTH_ENDPOINTS } from './oauth.endpoints';
import type {
  AuthorizeRequest,
  AuthorizeResponse,
  TokenRequest,
  TokenResponse,
  RevokeRequest,
  RevokeResponse,
  IntrospectRequest,
  IntrospectResponse,
  ScopesResponse,
} from './types/oauth.type';

/**
 * OAuth Service
 * 
 * Handles all OAuth 2.0 API calls including:
 * - Authorization code generation
 * - Token exchange and refresh
 * - Token revocation
 * - Token introspection
 * 
 * Note: These endpoints are primarily for third-party applications,
 * but are available in the frontend service for testing and completeness.
 */
export const oauthService = {
  /**
   * OAuth 2.0 Authorization Endpoint
   * Generates an authorization code for the Authorization Code flow
   * @param params - Authorization request parameters
   * @returns Authorization code and state
   */
  async authorize(params: AuthorizeRequest): Promise<AuthorizeResponse> {
    const queryParams: Record<string, string> = {
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      response_type: params.responseType,
      scope: params.scope,
    };

    if (params.state) {
      queryParams.state = params.state;
    }
    if (params.codeChallenge) {
      queryParams.code_challenge = params.codeChallenge;
    }
    if (params.codeChallengeMethod) {
      queryParams.code_challenge_method = params.codeChallengeMethod;
    }

    const response = await apiClient.get<AuthorizeResponse>(
      OAUTH_ENDPOINTS.AUTHORIZE,
      { params: queryParams },
    );
    return response.data;
  },

  /**
   * OAuth 2.0 Token Endpoint
   * Exchanges authorization code for access token, refreshes access token, or issues client credentials token
   * @param data - Token request data
   * @returns Access token and refresh token
   */
  async token(data: TokenRequest): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      OAUTH_ENDPOINTS.TOKEN,
      {
        grantType: data.grantType,
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        code: data.code,
        redirectUri: data.redirectUri,
        codeVerifier: data.codeVerifier,
        refreshToken: data.refreshToken,
        scope: data.scope,
      },
    );
    return response.data;
  },

  /**
   * OAuth 2.0 Token Revocation Endpoint
   * Revokes an access token or refresh token
   * @param data - Revocation request data
   * @returns Revocation confirmation
   */
  async revoke(data: RevokeRequest): Promise<RevokeResponse> {
    const response = await apiClient.post<RevokeResponse>(
      OAUTH_ENDPOINTS.REVOKE,
      {
        token: data.token,
        tokenTypeHint: data.tokenTypeHint,
      },
    );
    return response.data;
  },

  /**
   * OAuth 2.0 Token Introspection Endpoint
   * Returns information about a token (RFC 7662)
   * @param data - Introspection request data
   * @returns Token introspection result
   */
  async introspect(data: IntrospectRequest): Promise<IntrospectResponse> {
    const response = await apiClient.post<IntrospectResponse>(
      OAUTH_ENDPOINTS.INTROSPECT,
      {
        token: data.token,
        tokenTypeHint: data.tokenTypeHint,
      },
    );
    return response.data;
  },

  /**
   * List Available OAuth Scopes
   * Returns all available OAuth scopes with their descriptions and metadata
   * @returns List of available scopes
   */
  async getScopes(): Promise<ScopesResponse> {
    const response = await apiClient.get<ScopesResponse>(
      OAUTH_ENDPOINTS.SCOPES,
    );
    return response.data;
  },
};


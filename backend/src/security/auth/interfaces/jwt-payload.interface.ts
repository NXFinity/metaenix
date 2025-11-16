/**
 * JWT Payload Interface
 * Structure of the JWT token payload after decoding
 */
export interface JwtPayload {
  /**
   * Subject (user ID)
   */
  sub: string;

  /**
   * User email
   */
  email?: string;

  /**
   * User role
   */
  role?: string;

  /**
   * User roles (array)
   */
  roles?: string[];

  /**
   * User websocket ID
   */
  websocketId?: string;

  /**
   * Token issued at (timestamp)
   */
  iat?: number;

  /**
   * Token expiration (timestamp)
   */
  exp?: number;
}


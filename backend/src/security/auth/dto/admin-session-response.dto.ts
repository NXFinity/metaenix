export class AdminSessionResponseDto {
  adminSessionToken!: string;
  expiresAt!: Date;
  user!: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}


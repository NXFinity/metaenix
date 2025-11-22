import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ScopeService } from './scope.service';
import { Public } from '../../../auth/decorators/public.decorator';

@ApiTags('Developer Management | Scopes')
@Controller('oauth/scopes')
export class ScopesController {
  constructor(private readonly scopeService: ScopeService) {}

  /**
   * List available scopes
   * GET /oauth/scopes
   * Public endpoint
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'List Available OAuth Scopes',
    description: 'Returns all available OAuth scopes with their descriptions and metadata',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available scopes',
    schema: {
      type: 'object',
      properties: {
        scopes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'read:profile' },
              name: { type: 'string', example: 'Read Profile' },
              description: { type: 'string', example: 'Read user profile information' },
              category: { type: 'string', enum: ['read', 'write', 'admin'], example: 'read' },
              group: { type: 'string', example: 'profile' },
              requiresApproval: { type: 'boolean', example: false },
              isDefault: { type: 'boolean', example: true },
            },
          },
        },
      },
    },
  })
  async getScopes() {
    const scopes = this.scopeService.getAllScopes();
    return { scopes };
  }
}


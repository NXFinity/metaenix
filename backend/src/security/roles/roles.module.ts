import { Module, Global } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { AbilityFactory } from './assets/factories/ability.factory';

@Global()
@Module({
  controllers: [RolesController],
  providers: [RolesService, AbilityFactory],
  exports: [RolesService, AbilityFactory],
})
export class RolesModule {}

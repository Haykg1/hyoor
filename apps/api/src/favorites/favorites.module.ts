import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PropertiesModule } from '../properties/properties.module';

import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';

@Module({
  imports: [forwardRef(() => AuthModule), PropertiesModule],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}

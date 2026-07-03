import { forwardRef, Module } from '@nestjs/common';

import { AiSearchModule } from '../ai-search/ai-search.module';
import { AuthModule } from '../auth/auth.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { HostProfilesModule } from '../host-profiles/host-profiles.module';
import { StorageModule } from '../storage/storage.module';

import { BulkImportJobStore } from './bulk-import/bulk-import-job.store';
import { PropertyBulkImportController } from './bulk-import/property-bulk-import.controller';
import { PropertyBulkImportService } from './bulk-import/property-bulk-import.service';
import { RowGeocoderService } from './bulk-import/row-geocoder';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    HostProfilesModule,
    StorageModule,
    GeocodingModule,
    forwardRef(() => AiSearchModule),
  ],
  controllers: [PropertiesController, PropertyBulkImportController],
  providers: [PropertiesService, PropertyBulkImportService, RowGeocoderService, BulkImportJobStore],
  exports: [PropertiesService],
})
export class PropertiesModule {}

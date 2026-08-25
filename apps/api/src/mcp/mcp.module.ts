import { Module } from '@nestjs/common';

import { GeocodingModule } from '../geocoding/geocoding.module';
import { PropertiesModule } from '../properties/properties.module';

import { McpListingsService } from './mcp-listings.service';
import { McpProtocolService } from './mcp-protocol.service';
import { McpController } from './mcp.controller';

@Module({
  imports: [PropertiesModule, GeocodingModule],
  controllers: [McpController],
  providers: [McpListingsService, McpProtocolService],
})
export class McpModule {}

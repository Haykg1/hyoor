import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @SkipTransform()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({ description: 'Service is running' })
  @ApiStandardErrors({ auth: false })
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

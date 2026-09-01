import { Controller, MessageEvent, Param, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SkipTransform } from '../common/decorators/skip-transform.decorator';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { SseJwtGuard } from '../notifications/guards/sse-jwt.guard';

import { TripPlannerService } from './trip-planner.service';

@ApiTags('trip-planner')
@Controller('trip-planner')
export class TripPlannerStreamController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Sse(':id/events')
  @SkipTransform()
  @UseGuards(SseJwtGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'SSE stream of trip plan generation progress (pass access_token query param)',
  })
  @ApiStandardErrors({ auth: true, notFound: true })
  async stream(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    await this.tripPlannerService.assertOwned(user.userId, id);
    return this.tripPlannerService.streamEvents(user.userId, id);
  }
}

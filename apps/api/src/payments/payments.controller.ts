import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentProvider } from '@repo/database/client';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';

import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('bookings/webhooks')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public webhook endpoint for payment provider callbacks' })
  @ApiOkResponse({ description: 'Webhook accepted' })
  @ApiStandardErrors({ auth: false })
  webhook(
    @Param('provider') provider: string,
    @Body() payload: unknown,
    @Headers('x-signature') signature?: string,
  ): Promise<{ received: true }> {
    const normalized = provider.toUpperCase() as PaymentProvider;
    return this.paymentsService.handleWebhook(normalized, payload, signature);
  }
}

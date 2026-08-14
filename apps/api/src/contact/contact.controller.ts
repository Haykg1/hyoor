import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { ContactInbox } from '@repo/shared';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { CONTACT_THROTTLE } from '../common/throttle/throttle.constants';

import { ContactService } from './contact.service';
import { CreateContactInquiryDto } from './dto/create-contact-inquiry.dto';

@ApiTags('contact')
@Controller('contact')
@Throttle(CONTACT_THROTTLE)
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Send a public contact-form message to support or info inbox' })
  @ApiCreatedResponse({ description: 'Message accepted for delivery' })
  @ApiStandardErrors({ auth: false, throttle: true })
  submit(@Body() dto: CreateContactInquiryDto): Promise<{ inbox: ContactInbox }> {
    return this.contactService.submit(dto);
  }
}

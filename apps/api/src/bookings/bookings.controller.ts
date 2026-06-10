import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { BookingQuoteResult, PaginatedResponse } from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { WRITE_THROTTLE } from '../common/throttle/throttle.constants';
import { CheckoutDto } from '../payments/dto/checkout.dto';
import type { CheckoutInitResult } from '../payments/payment-provider.interface';
import { PaymentsService } from '../payments/payments.service';

import { BookingsService, type BookingDetail } from './bookings.service';
import { BookingQuoteDto } from './dto/booking-quote.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PaymentRefDto } from './dto/payment-ref.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';

@ApiTags('bookings')
@Controller('bookings')
@Throttle(WRITE_THROTTLE)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('quote')
  @ApiOperation({ summary: 'Preview stay pricing with eligible promotions' })
  @ApiOkResponse({ description: 'Price breakdown including promotion discount' })
  @ApiStandardErrors({ auth: false, notFound: true })
  getQuote(@Query() dto: BookingQuoteDto): Promise<BookingQuoteResult> {
    return this.bookingsService.getQuote(dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GUEST', 'HOST')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an instant reservation for a property' })
  @ApiCreatedResponse({ description: 'Booking created in CONFIRMED status' })
  @ApiStandardErrors({ conflict: true })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBookingDto): Promise<BookingDetail> {
    return this.bookingsService.create(user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all bookings (admin/staff only)' })
  @ApiOkResponse({ description: 'Paginated booking list with filters' })
  @ApiStandardErrors()
  findAll(@Query() dto: QueryBookingsDto): Promise<PaginatedResponse<BookingDetail>> {
    return this.bookingsService.findAll(dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookings for the authenticated user (guest or host)' })
  @ApiOkResponse({ description: 'Paginated bookings relevant to the current user' })
  @ApiStandardErrors()
  findMy(
    @CurrentUser() user: RequestUser,
    @Query() dto: QueryBookingsDto,
  ): Promise<PaginatedResponse<BookingDetail>> {
    return this.bookingsService.findMyBookings(user.userId, user.role, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking detail by ID' })
  @ApiOkResponse({ description: 'Booking with property and participant info' })
  @ApiStandardErrors({ notFound: true })
  findById(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<BookingDetail> {
    return this.bookingsService.findById(id, user.userId, user.role);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Confirm a pending booking (legacy — new bookings are instant)',
    deprecated: true,
  })
  @ApiOkResponse({ description: 'Booking confirmed; dates blocked on calendar' })
  @ApiStandardErrors({ notFound: true, conflict: true })
  confirm(@Param('id') id: string, @CurrentUser() user: RequestUser): Promise<BookingDetail> {
    return this.bookingsService.confirm(id, user.userId);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a booking (guest or host)' })
  @ApiOkResponse({ description: 'Booking cancelled; dates unblocked if previously confirmed' })
  @ApiStandardErrors({ notFound: true })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingDetail> {
    return this.bookingsService.cancel(id, user.userId, user.role, dto);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a booking as completed (admin/staff only)' })
  @ApiOkResponse({ description: 'Booking marked COMPLETED; enables reviews' })
  @ApiStandardErrors({ notFound: true })
  complete(@Param('id') id: string): Promise<BookingDetail> {
    return this.bookingsService.complete(id);
  }

  @Patch(':id/payment-ref')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach an external payment reference to a booking (guest only)' })
  @ApiOkResponse({ description: 'Payment reference saved' })
  @ApiStandardErrors({ notFound: true })
  attachPaymentRef(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: PaymentRefDto,
  ): Promise<BookingDetail> {
    return this.bookingsService.attachPaymentRef(id, user.userId, dto.externalPaymentRef);
  }

  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate checkout with a payment provider for the booking' })
  @ApiOkResponse({ description: 'Provider-specific checkout details (redirect URL or token)' })
  @ApiStandardErrors({ notFound: true })
  checkout(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CheckoutDto,
  ): Promise<CheckoutInitResult> {
    return this.paymentsService.initiateCheckout(id, user.userId, dto.provider);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CancellationFeeClaim,
  Property,
  SecurityDepositClaim,
  User,
} from '@repo/database/client';
import type {
  AdminBooking,
  AdminCancellationFeeClaim,
  AdminDepositClaim,
  AdminHost,
  AdminPaymentFailure,
  HostDashboardStats,
  HostListingsResponse,
  PaginatedResponse,
} from '@repo/shared';

import type { RequestUser } from '../auth/decorators/current-user.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CancellationClaimsService } from '../cancellation-claims/cancellation-claims.service';
import { ReviewCancellationClaimDto } from '../cancellation-claims/dto/review-cancellation-claim.dto';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { DepositClaimsService } from '../deposit-claims/deposit-claims.service';
import { ReviewDepositClaimDto } from '../deposit-claims/dto/review-deposit-claim.dto';
import { PaymentFailuresService } from '../payment-failures/payment-failures.service';
import { PoiSeedService, type PoiSeedResult } from '../poi/poi-seed.service';
import { UpdatePropertyStatusDto } from '../properties/dto/update-property-status.dto';
import { CheckinCaptureCronService } from '../scheduling/checkin-capture-cron.service';
import { DepositReleaseCronService } from '../scheduling/deposit-release-cron.service';
import { GuestInstructionsCronService } from '../scheduling/guest-instructions-cron.service';
import { HostPayoutCronService } from '../scheduling/host-payout-cron.service';
import { PaymentLockSweeperService } from '../scheduling/payment-lock-sweeper.service';

import {
  AdminService,
  type AdminUserDetail,
  type PlatformStats,
  type TimeseriesResponse,
} from './admin.service';
import { BulkResolvePaymentFailuresDto } from './dto/bulk-resolve-payment-failures.dto';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryAdminEarningsDto } from './dto/query-admin-earnings.dto';
import { QueryAdminHostsDto } from './dto/query-admin-hosts.dto';
import { QueryAdminPropertiesDto } from './dto/query-admin-properties.dto';
import { QueryPaymentFailuresDto } from './dto/query-payment-failures.dto';
import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateHostPlatformFeeDto } from './dto/update-host-platform-fee.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly cancellationClaims: CancellationClaimsService,
    private readonly depositClaims: DepositClaimsService,
    private readonly depositReleaseCron: DepositReleaseCronService,
    private readonly guestInstructionsCron: GuestInstructionsCronService,
    private readonly checkinCaptureCron: CheckinCaptureCronService,
    private readonly paymentLockSweeperCron: PaymentLockSweeperService,
    private readonly hostPayoutCron: HostPayoutCronService,
    private readonly paymentFailures: PaymentFailuresService,
    private readonly poiSeedService: PoiSeedService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  @ApiOkResponse({ description: 'Aggregated counts by role, status, and average rating' })
  @ApiStandardErrors()
  getStats(): Promise<PlatformStats> {
    return this.adminService.getStats();
  }

  @Get('stats/timeseries')
  @ApiOperation({ summary: 'Get a time-series chart for users, bookings, or revenue' })
  @ApiOkResponse({ description: 'Bucketed time series for the requested metric and range' })
  @ApiStandardErrors()
  getTimeseries(@Query() dto: QueryTimeseriesDto): Promise<TimeseriesResponse> {
    return this.adminService.getTimeseries(dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional filters' })
  @ApiOkResponse({ description: 'Paginated user list' })
  @ApiStandardErrors()
  getUsers(@Query() dto: QueryUsersDto): Promise<PaginatedResponse<User>> {
    return this.adminService.getUsers(dto);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed user info including profile and booking count' })
  @ApiOkResponse({ description: 'User detail with profile and host summary' })
  @ApiStandardErrors({ notFound: true })
  getUserDetail(@Param('id') id: string): Promise<AdminUserDetail> {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  @ApiOkResponse({ description: 'Updated user' })
  @ApiStandardErrors({ notFound: true })
  setUserStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto): Promise<User> {
    return this.adminService.setUserStatus(id, dto.isActive);
  }

  @Patch('users/:id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Change a user role (admin only)' })
  @ApiOkResponse({ description: 'Updated user with new role' })
  @ApiStandardErrors({ notFound: true })
  setUserRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto): Promise<User> {
    return this.adminService.setUserRole(id, dto.role);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiOkResponse({ description: 'Property and booking counts for the admin dashboard' })
  @ApiStandardErrors()
  getDashboardStats(@Query() dto: QueryAdminEarningsDto): Promise<HostDashboardStats> {
    return this.adminService.getDashboardStats(dto);
  }

  @Get('properties')
  @ApiOperation({ summary: 'List all properties with pagination and dashboard stats' })
  @ApiOkResponse({ description: 'Paginated property list with filters and dashboard stats' })
  @ApiStandardErrors()
  getProperties(@Query() dto: QueryAdminPropertiesDto): Promise<HostListingsResponse> {
    return this.adminService.findListings(dto);
  }

  @Patch('properties/:id/status')
  @ApiOperation({ summary: 'Change property status' })
  @ApiOkResponse({ description: 'Updated property' })
  @ApiStandardErrors({ notFound: true })
  setPropertyStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyStatusDto,
  ): Promise<Property> {
    return this.adminService.setPropertyStatus(
      id,
      dto.status as import('@repo/database/client').PropertyStatus,
    );
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings with optional filters' })
  @ApiOkResponse({ description: 'Paginated booking list with status, property, and date filters' })
  @ApiStandardErrors()
  getBookings(@Query() dto: QueryAdminBookingsDto): Promise<PaginatedResponse<AdminBooking>> {
    return this.adminService.getBookings(dto);
  }

  @Post('bookings/:id/retry-rent-capture')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retry failed or pending rent capture for a booking (admin only)' })
  @ApiOkResponse({ description: 'Updated booking after capture attempt' })
  @ApiStandardErrors({ notFound: true })
  retryRentCapture(@Param('id') id: string): Promise<AdminBooking> {
    return this.adminService.retryRentCapture(id);
  }

  @Post('bookings/:id/retry-payout')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Retry failed or due host payout for a booking (admin only)' })
  @ApiOkResponse({ description: 'Updated booking after payout attempt' })
  @ApiStandardErrors({ notFound: true })
  retryPayout(@Param('id') id: string): Promise<AdminBooking> {
    return this.adminService.retryPayout(id);
  }

  @Get('hosts')
  @ApiOperation({ summary: 'List host profiles with platform fee settings' })
  @ApiOkResponse({ description: 'Paginated host list' })
  @ApiStandardErrors()
  getHosts(@Query() dto: QueryAdminHostsDto): Promise<PaginatedResponse<AdminHost>> {
    return this.adminService.getHosts(dto);
  }

  @Patch('hosts/:id/platform-fee')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Set or clear a negotiated platform fee override for a host (admin only)',
  })
  @ApiOkResponse({ description: 'Updated host with effective fee' })
  @ApiStandardErrors({ notFound: true })
  setHostPlatformFee(
    @Param('id') id: string,
    @Body() dto: UpdateHostPlatformFeeDto,
  ): Promise<AdminHost> {
    return this.adminService.setHostPlatformFee(id, dto.platformFeePercent);
  }

  @Get('deposit-claims')
  @ApiOperation({ summary: 'List pending security-deposit damage claims' })
  @ApiOkResponse({ description: 'Pending claims awaiting review, oldest first' })
  @ApiStandardErrors()
  getPendingDepositClaims(): Promise<AdminDepositClaim[]> {
    return this.depositClaims.findPendingDetailed();
  }

  @Patch('deposit-claims/:id')
  @ApiOperation({ summary: 'Approve or reject a security-deposit damage claim' })
  @ApiOkResponse({ description: 'Reviewed claim; approval captures and transfers the deposit' })
  @ApiStandardErrors({ notFound: true })
  reviewDepositClaim(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReviewDepositClaimDto,
  ): Promise<SecurityDepositClaim> {
    return this.depositClaims.review(id, user.userId, dto);
  }

  @Get('cancellation-fee-claims')
  @ApiOperation({ summary: 'List pending host cancellation-fee claims' })
  @ApiOkResponse({ description: 'Pending claims awaiting review, oldest first' })
  @ApiStandardErrors()
  getPendingCancellationClaims(): Promise<AdminCancellationFeeClaim[]> {
    return this.cancellationClaims.findPendingDetailed();
  }

  @Patch('cancellation-fee-claims/:id')
  @ApiOperation({ summary: 'Approve or reject a host cancellation-fee claim' })
  @ApiOkResponse({
    description: 'Reviewed claim; approval captures the fee, rejection releases the full hold',
  })
  @ApiStandardErrors({ notFound: true })
  reviewCancellationClaim(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReviewCancellationClaimDto,
  ): Promise<CancellationFeeClaim> {
    return this.cancellationClaims.review(id, user.userId, dto);
  }

  @Post('cron/release-expired-deposit-holds')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually run the expired security-deposit release job (admin only)' })
  @ApiOkResponse({ description: 'Job ran to completion' })
  @ApiStandardErrors()
  async runReleaseExpiredDepositHolds(): Promise<{ message: string }> {
    await this.depositReleaseCron.releaseExpiredDepositHolds();
    return { message: 'releaseExpiredDepositHolds completed' };
  }

  @Post('cron/send-guest-instructions')
  @Roles('ADMIN')
  @ApiOperation({
    summary: "Manually run today's guest check-in instructions email job (admin only)",
  })
  @ApiOkResponse({ description: 'Job ran to completion' })
  @ApiStandardErrors()
  async runSendGuestInstructionsForToday(): Promise<{ message: string }> {
    await this.guestInstructionsCron.sendGuestInstructionsForToday();
    return { message: 'sendGuestInstructionsForToday completed' };
  }

  @Post('cron/capture-todays-checkins')
  @Roles('ADMIN')
  @ApiOperation({ summary: "Manually run today's check-in rent capture job (admin only)" })
  @ApiOkResponse({ description: 'Job ran to completion' })
  @ApiStandardErrors()
  async runCaptureTodaysCheckIns(): Promise<{ message: string }> {
    await this.checkinCaptureCron.captureTodaysCheckIns();
    return { message: 'captureTodaysCheckIns completed' };
  }

  @Post('cron/sweep-expired-payment-locks')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually run the expired payment lock sweep job (admin only)' })
  @ApiOkResponse({ description: 'Job ran to completion' })
  @ApiStandardErrors()
  async runSweepExpiredPaymentLocks(): Promise<{ message: string }> {
    await this.paymentLockSweeperCron.sweepExpiredPaymentLocks();
    return { message: 'sweepExpiredPaymentLocks completed' };
  }

  @Post('cron/run-scheduled-payouts')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Manually run the scheduled host payouts job (admin only)' })
  @ApiOkResponse({ description: 'Job ran to completion' })
  @ApiStandardErrors()
  async runScheduledPayouts(): Promise<{ message: string }> {
    await this.hostPayoutCron.runScheduledPayouts();
    return { message: 'runScheduledPayouts completed' };
  }

  @Post('poi/seed')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Force-seed curated POI GEO indexes into Redis (admin only)' })
  @ApiOkResponse({ description: 'POI GEO datasets seeded' })
  @ApiStandardErrors()
  seedPois(): Promise<PoiSeedResult> {
    return this.poiSeedService.forceSeed();
  }

  @Get('payment-failures')
  @ApiOperation({ summary: 'List payment-processing failures with filters' })
  @ApiOkResponse({ description: 'Paginated payment failure list' })
  @ApiStandardErrors()
  getPaymentFailures(
    @Query() dto: QueryPaymentFailuresDto,
  ): Promise<PaginatedResponse<AdminPaymentFailure>> {
    return this.paymentFailures.list({
      ...dto,
      resolved: dto.resolved === undefined ? undefined : dto.resolved === 'true',
    });
  }

  @Patch('payment-failures/resolve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mark multiple payment failures as resolved (admin only)' })
  @ApiOkResponse({ description: 'Failures marked resolved' })
  @ApiStandardErrors({ notFound: true })
  async resolvePaymentFailures(
    @Body() dto: BulkResolvePaymentFailuresDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ message: string; resolvedCount: number }> {
    const { resolvedCount } = await this.paymentFailures.resolveMany(dto.ids, user.userId);
    return { message: 'Payment failures marked resolved', resolvedCount };
  }

  @Patch('payment-failures/:id/resolve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Mark a payment failure as resolved (admin only)' })
  @ApiOkResponse({ description: 'Failure marked resolved' })
  @ApiStandardErrors({ notFound: true })
  async resolvePaymentFailure(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ message: string }> {
    await this.paymentFailures.resolve(id, user.userId);
    return { message: 'Payment failure marked resolved' };
  }
}

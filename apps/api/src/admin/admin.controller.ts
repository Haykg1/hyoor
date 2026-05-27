import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Booking, Property, User } from '@repo/database/client';
import type { PaginatedResponse } from '@repo/shared';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import { UpdatePropertyStatusDto } from '../properties/dto/update-property-status.dto';

import {
  AdminService,
  type AdminUserDetail,
  type PlatformStats,
  type TimeseriesResponse,
} from './admin.service';
import { QueryAdminBookingsDto } from './dto/query-admin-bookings.dto';
import { QueryTimeseriesDto } from './dto/query-timeseries.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'STAFF')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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

  @Get('properties')
  @ApiOperation({ summary: 'List all properties with pagination' })
  @ApiOkResponse({ description: 'Paginated property list (all statuses)' })
  @ApiStandardErrors()
  getProperties(@Query() dto: QueryUsersDto): Promise<PaginatedResponse<Property>> {
    return this.adminService.getProperties(dto);
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
  getBookings(@Query() dto: QueryAdminBookingsDto): Promise<PaginatedResponse<Booking>> {
    return this.adminService.getBookings(dto);
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum TimeseriesMetric {
  USERS = 'users',
  BOOKINGS = 'bookings',
  REVENUE = 'revenue',
}

export enum TimeseriesRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class QueryTimeseriesDto {
  @ApiProperty({ enum: TimeseriesMetric, default: TimeseriesMetric.BOOKINGS })
  @IsOptional()
  @IsEnum(TimeseriesMetric)
  metric: TimeseriesMetric = TimeseriesMetric.BOOKINGS;

  @ApiProperty({ enum: TimeseriesRange, default: TimeseriesRange.DAY })
  @IsOptional()
  @IsEnum(TimeseriesRange)
  range: TimeseriesRange = TimeseriesRange.DAY;

  @ApiProperty({ example: '2025-01-01', required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ example: '2025-12-31', required: false })
  @IsOptional()
  @IsString()
  to?: string;
}

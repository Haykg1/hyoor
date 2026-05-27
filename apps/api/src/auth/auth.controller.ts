import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';

import { ApiStandardErrors } from '../common/swagger/api-responses.decorator';
import type { AppConfig } from '../config/configuration';

import { AuthService, type AuthResponse } from './auth.service';
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const AUTH_THROTTLE_TTL_MS = parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10);
const AUTH_THROTTLE_LIMIT = parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10);
const AUTH_THROTTLE = {
  default: { ttl: AUTH_THROTTLE_TTL_MS, limit: AUTH_THROTTLE_LIMIT },
};

@ApiTags('auth')
@Controller('auth')
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({ description: 'User registered; access and refresh tokens returned' })
  @ApiStandardErrors({ auth: false, conflict: true, throttle: true })
  register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ description: 'Authenticated; access and refresh tokens returned' })
  @ApiStandardErrors({ auth: false, throttle: true })
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @ApiOkResponse({ description: 'New access and refresh tokens returned' })
  @ApiStandardErrors({ auth: false, throttle: true })
  refresh(@Body() dto: RefreshTokenDto): Promise<Omit<AuthResponse, 'user'>> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token (logout)' })
  @ApiOkResponse({ description: 'Refresh token revoked' })
  @ApiStandardErrors({ auth: false, throttle: true })
  logout(@Body() dto: RefreshTokenDto): Promise<{ success: true }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('verify/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Send a new OTP verification code to the current user' })
  @ApiOkResponse({ description: 'Verification code dispatched' })
  @ApiStandardErrors({ throttle: true })
  sendOtp(@CurrentUser() user: RequestUser): Promise<{ sent: true }> {
    return this.authService.sendVerificationOtp(user.userId);
  }

  @Post('verify/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm email with a 6-digit OTP code' })
  @ApiOkResponse({ description: 'Email verified' })
  @ApiStandardErrors({ throttle: true })
  verifyOtp(
    @CurrentUser() user: RequestUser,
    @Body() dto: VerifyOtpDto,
  ): Promise<{ verified: true }> {
    return this.authService.verifyEmail(user.userId, dto.code);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiOkResponse({ description: 'Always returns success to avoid email enumeration' })
  @ApiStandardErrors({ auth: false, throttle: true })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ success: true }> {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using a token from the reset email' })
  @ApiOkResponse({ description: 'Password updated' })
  @ApiStandardErrors({ auth: false, throttle: true })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<{ success: true }> {
    return this.authService.resetPassword(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth sign-in (redirects to Google)' })
  @ApiStandardErrors({ auth: false, throttle: true })
  googleAuth(): void {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback — redirects to frontend with tokens' })
  @ApiStandardErrors({ auth: false, throttle: true })
  googleCallback(@Req() req: { user: AuthResponse }, @Res() res: Response): void {
    const { accessToken, refreshToken } = req.user;
    const frontendUrl = this.config.get('frontend.url', { infer: true });
    const redirectUrl = new URL('/auth/callback', frontendUrl);
    redirectUrl.searchParams.set('accessToken', accessToken);
    redirectUrl.searchParams.set('refreshToken', refreshToken);
    res.redirect(redirectUrl.toString());
  }
}

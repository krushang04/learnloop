import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiValidationError } from 'src/common/decorators/api-responses.decorator';
import { AuthUser, CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiResponse({ status: 200, description: 'Token issued' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @ApiValidationError()
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Self-service signup',
    description: 'Always creates a learner account. Admin accounts come from the seed script.',
  })
  @ApiResponse({ status: 201, description: 'Learner account created, with a token to use at once' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiValidationError()
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user - used to rehydrate the session on refresh' })
  @ApiResponse({ status: 200, description: 'The signed-in user, without the password hash' })
  @ApiResponse({ status: 401, description: 'Missing, malformed or expired access token' })
  me(@CurrentUser() user: AuthUser) {
    return this.authService.profile(user);
  }
}

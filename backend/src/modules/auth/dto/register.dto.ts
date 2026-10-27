import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UserRole } from 'src/common/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Asha Menon' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Transform(({ value }) => String(value ?? '').trim())
  name: string;

  @ApiProperty({ example: 'asha@learnloop.dev' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => String(value ?? '').toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'Learner@123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain at least one letter' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.LEARNER,
    description: 'Self-service signup is always a learner; only an admin may create another admin.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

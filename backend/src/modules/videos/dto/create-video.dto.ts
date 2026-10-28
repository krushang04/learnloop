import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VideoStatus } from 'src/common/enums';

const URL_RULES = { require_protocol: true, protocols: ['http', 'https'] };

export class CreateVideoDto {
  @ApiProperty({ example: 'Intro to Trade Compliance' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Transform(({ value }) => String(value ?? '').trim())
  title: string;

  @ApiPropertyOptional({ example: 'A 10-minute primer on HS codes.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => String(value ?? '').trim())
  description?: string;

  @ApiPropertyOptional({ example: 'https://picsum.photos/seed/trade/640/360' })
  @IsOptional()
  @IsUrl(URL_RULES, { message: 'thumbnailUrl must be a valid http(s) URL' })
  thumbnailUrl?: string;

  @ApiProperty({ example: 'https://cdn.example.com/lessons/intro.mp4' })
  @IsUrl(URL_RULES, { message: 'videoUrl must be a valid http(s) URL' })
  videoUrl: string;

  @ApiPropertyOptional({
    example: 596,
    description:
      'Total length in seconds. Optional on the wire - the admin UI reads it from the video file and fills it in - but required before the video can be published.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({ enum: VideoStatus, default: VideoStatus.DRAFT })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;

  @ApiPropertyOptional({ type: [String], example: ['compliance', 'onboarding'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean) : [],
  )
  tags?: string[];
}

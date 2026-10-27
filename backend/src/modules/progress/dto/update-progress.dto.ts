import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({ example: 132.5, description: 'Current playhead position in seconds' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  positionSeconds: number;

  @ApiPropertyOptional({
    example: 596,
    description:
      'Duration as reported by the browser. Used to backfill videos created without one.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  durationSeconds?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProgressStatus } from 'src/common/enums';

export class LearnerQueryDto {
  @ApiPropertyOptional({ description: 'Matches video title or description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ProgressStatus, description: 'Filter by the learner\'s own progress' })
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;
}

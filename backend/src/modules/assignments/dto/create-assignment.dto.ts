import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDate, IsMongoId, IsOptional } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({
    type: [String],
    description: 'Learner ids to assign this video to. Already-assigned learners are skipped.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one learner' })
  @ArrayMaxSize(200, { message: 'Assign to at most 200 learners at a time' })
  @IsMongoId({ each: true, message: 'Each learner id must be a valid id' })
  learnerIds: string[];

  @ApiPropertyOptional({ description: 'Optional due date (ISO 8601)' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueAt?: Date;
}

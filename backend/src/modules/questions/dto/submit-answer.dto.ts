import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitAnswerDto {
  @ApiPropertyOptional({ type: [String], example: ['a'], description: 'For choice questions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionKeys?: string[];

  @ApiPropertyOptional({ example: 'Harmonized System', description: 'For short-answer questions' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => String(value ?? '').trim())
  answerText?: string;
}

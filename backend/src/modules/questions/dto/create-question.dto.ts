import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from 'src/common/enums';

export class QuestionOptionDto {
  @ApiProperty({ example: 'a', description: 'Short stable key, unique within the question' })
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  @Transform(({ value }) => String(value ?? '').trim())
  key: string;

  @ApiProperty({ example: 'A six-digit commodity code' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Transform(({ value }) => String(value ?? '').trim())
  text: string;
}

export class CreateQuestionDto {
  @ApiProperty({ example: 45, description: 'Playback position in seconds where the video pauses' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  timestampSeconds: number;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({ example: 'What does an HS code identify?' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Transform(({ value }) => String(value ?? '').trim())
  prompt: string;

  @ApiPropertyOptional({ type: [QuestionOptionDto], description: 'Required for choice questions' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @ApiPropertyOptional({ type: [String], example: ['a'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  correctOptionKeys?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['harmonized system', 'hs'],
    description: 'Accepted short answers, matched case-insensitively after trimming',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((a: string) => String(a).trim()).filter(Boolean) : [],
  )
  acceptedAnswers?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  points?: number;

  @ApiPropertyOptional({ description: 'Shown to the learner after they answer' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(({ value }) => String(value ?? '').trim())
  explanation?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

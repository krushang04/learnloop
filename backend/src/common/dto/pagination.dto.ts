import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({ description: 'Case-insensitive partial match' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return { total, page, limit, totalPages, hasNextPage: page < totalPages };
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

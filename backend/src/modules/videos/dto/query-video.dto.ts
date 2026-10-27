import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { VideoStatus } from 'src/common/enums';

export class QueryVideoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VideoStatus })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;

  @ApiPropertyOptional({ description: 'Comma-free single tag filter', example: 'compliance' })
  @IsOptional()
  tag?: string;
}

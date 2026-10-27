import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole, VideoStatus } from 'src/common/enums';
import { Paginated } from 'src/common/interceptors/transform.interceptor';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { CreateVideoDto } from './dto/create-video.dto';
import { QueryVideoDto } from './dto/query-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';

@ApiTags('Videos (Admin)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post()
  @ApiOperation({ summary: 'Create a video' })
  create(@Body() dto: CreateVideoDto, @CurrentUser() user: AuthUser) {
    return this.videosService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List videos',
    description: 'Supports ?search=, ?status=, ?tag=, ?page=, ?limit=.',
  })
  async findAll(@Query() query: QueryVideoDto) {
    const { items, meta } = await this.videosService.findAll(query);
    return new Paginated(items, meta);
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Video id' })
  @ApiOperation({ summary: 'Video detail, including its questions with correct answers' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.videosService.findDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a video' })
  @ApiResponse({ status: 400, description: 'Shortening past an existing question timestamp' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateVideoDto) {
    return this.videosService.update(id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({
    summary: 'Publish a video',
    description: 'Rejected if the duration is unset or any question lacks a correct answer.',
  })
  publish(@Param('id', ParseObjectIdPipe) id: string) {
    return this.videosService.setStatus(id, VideoStatus.PUBLISHED);
  }

  @Patch(':id/unpublish')
  @ApiOperation({
    summary: 'Unpublish a video',
    description: 'Hides it from learners. Assignments and recorded progress are kept.',
  })
  unpublish(@Param('id', ParseObjectIdPipe) id: string) {
    return this.videosService.setStatus(id, VideoStatus.DRAFT);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a video',
    description: 'Cascades to its questions, assignments, progress and responses.',
  })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.videosService.remove(id);
  }
}

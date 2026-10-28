import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  ApiAuthErrors,
  ApiNotFound,
  ApiValidationError,
} from 'src/common/decorators/api-responses.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { ProgressService } from 'src/modules/progress/progress.service';
import { VideosService } from 'src/modules/videos/videos.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('Questions (Admin)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@ApiAuthErrors()
@Controller()
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    @Inject(forwardRef(() => VideosService))
    private readonly videosService: VideosService,
    @Inject(forwardRef(() => ProgressService))
    private readonly progressService: ProgressService,
  ) {}

  @Get('videos/:videoId/questions')
  @ApiOperation({ summary: 'List a video\'s questions in playback order (with correct answers)' })
  @ApiResponse({ status: 200, description: 'Questions ordered by timestamp' })
  @ApiNotFound('video')
  async list(@Param('videoId', ParseObjectIdPipe) videoId: string) {
    await this.videosService.findByIdOrFail(videoId);
    return this.questionsService.findByVideoId(videoId, { includeAnswers: true });
  }

  @Post('videos/:videoId/questions')
  @ApiOperation({ summary: 'Add a timestamp question to a video' })
  @ApiResponse({ status: 400, description: 'Invalid shape for the chosen question type' })
  @ApiResponse({ status: 201, description: 'Created. Affected learners are moved back out of completed.' })
  @ApiResponse({ status: 409, description: 'Another question already fires at this second' })
  @ApiNotFound('video')
  async create(
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const video = await this.videosService.findByIdOrFail(videoId);

    // A question past the end of the video would never fire.
    if (video.durationSeconds && dto.timestampSeconds > video.durationSeconds) {
      throw new BadRequestException(
        `Timestamp ${dto.timestampSeconds}s is past the end of this video (${video.durationSeconds}s)`,
      );
    }
    const created = await this.questionsService.create(videoId, dto);

    // Completing a video requires answering every question, so a new one means
    // learners who had finished the old set are no longer finished.
    await this.progressService.recalculateForVideo(videoId);
    return created;
  }

  @Patch('questions/:id')
  @ApiOperation({ summary: 'Update a question' })
  @ApiResponse({ status: 200, description: 'The updated question' })
  @ApiResponse({ status: 400, description: 'Invalid shape for the chosen question type' })
  @ApiResponse({ status: 409, description: 'Another question already fires at this second' })
  @ApiNotFound('question')
  @ApiValidationError()
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete('questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a question',
    description: 'Also removes every learner response to it, and re-derives their progress.',
  })
  @ApiResponse({ status: 204, description: 'Deleted, along with its responses' })
  @ApiNotFound('question')
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    const videoId = await this.questionsService.remove(id);
    // One fewer question to answer can be what tips a learner into completed.
    await this.progressService.recalculateForVideo(videoId.toString());
  }
}

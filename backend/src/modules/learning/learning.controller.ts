import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { SubmitAnswerDto } from 'src/modules/questions/dto/submit-answer.dto';
import { UpdateProgressDto } from 'src/modules/progress/dto/update-progress.dto';
import { LearnerQueryDto } from './dto/learner-query.dto';
import { LearningService } from './learning.service';

@ApiTags('Learning (Learner)')
@ApiBearerAuth()
@Roles(UserRole.LEARNER)
@Controller('me')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('assignments')
  @ApiOperation({
    summary: 'Videos assigned to me, with my progress on each',
    description: 'Supports ?search= and ?status=not_started|in_progress|completed.',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: LearnerQueryDto) {
    return this.learningService.listAssignedVideos(user.id, query);
  }

  @Get('assignments/:videoId')
  @ApiOperation({
    summary: 'Everything the player needs for one video',
    description:
      'Returns the video, its questions WITHOUT correct answers, my saved progress and my previous answers.',
  })
  @ApiResponse({ status: 403, description: 'Video not assigned to this learner' })
  @ApiResponse({ status: 404, description: 'Video is unpublished or does not exist' })
  detail(@CurrentUser() user: AuthUser, @Param('videoId', ParseObjectIdPipe) videoId: string) {
    return this.learningService.getPlayerPayload(videoId, user.id);
  }

  @Put('assignments/:videoId/progress')
  @ApiOperation({
    summary: 'Autosave playback position',
    description:
      'Called periodically and on pause/seek/unload. Idempotent; completion percentage only ever moves forward.',
  })
  saveProgress(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.learningService.saveProgress(videoId, user.id, dto);
  }

  @Post('assignments/:videoId/questions/:questionId/answer')
  @ApiOperation({
    summary: 'Submit an answer to a timestamp question',
    description: 'Graded server-side. Re-answering overwrites the previous attempt.',
  })
  @ApiResponse({ status: 400, description: 'Answer shape does not match the question type' })
  answer(
    @CurrentUser() user: AuthUser,
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Param('questionId', ParseObjectIdPipe) questionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.learningService.submitAnswer(videoId, questionId, user.id, dto);
  }
}

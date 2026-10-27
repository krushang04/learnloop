import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { ReportsService } from './reports.service';

@ApiTags('Reports (Admin)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard counters across all videos and learners' })
  overview() {
    return this.reportsService.overview();
  }

  @Get('videos/:videoId')
  @ApiOperation({ summary: 'Per-learner progress table for one video' })
  videoReport(@Param('videoId', ParseObjectIdPipe) videoId: string) {
    return this.reportsService.videoReport(videoId);
  }

  @Get('videos/:videoId/learners/:learnerId')
  @ApiOperation({
    summary: 'One learner\'s answer sheet for one video',
    description: 'Every question with the correct answer alongside what the learner submitted.',
  })
  learnerResponses(
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Param('learnerId', ParseObjectIdPipe) learnerId: string,
  ) {
    return this.reportsService.learnerResponses(videoId, learnerId);
  }
}

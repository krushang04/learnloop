import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('Assignments (Admin)')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('videos/:videoId/assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Assign a video to learners',
    description: 'Idempotent — learners who already have it are reported, not duplicated.',
  })
  @ApiResponse({ status: 404, description: 'Unknown or inactive learner id in the list' })
  assign(
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assignmentsService.assign(videoId, dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List learners assigned to a video' })
  list(@Param('videoId', ParseObjectIdPipe) videoId: string) {
    return this.assignmentsService.listForVideo(videoId);
  }

  @Delete(':learnerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unassign a learner',
    description: 'Their recorded progress and answers are retained for reporting.',
  })
  unassign(
    @Param('videoId', ParseObjectIdPipe) videoId: string,
    @Param('learnerId', ParseObjectIdPipe) learnerId: string,
  ) {
    return this.assignmentsService.unassign(videoId, learnerId);
  }
}

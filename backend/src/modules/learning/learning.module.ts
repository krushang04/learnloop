import { Module } from '@nestjs/common';
import { AssignmentsModule } from 'src/modules/assignments/assignments.module';
import { ProgressModule } from 'src/modules/progress/progress.module';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { ResponsesModule } from 'src/modules/responses/responses.module';
import { VideosModule } from 'src/modules/videos/videos.module';
import { LearningController } from './learning.controller';
import { LearningService } from './learning.service';

@Module({
  imports: [AssignmentsModule, VideosModule, QuestionsModule, ProgressModule, ResponsesModule],
  controllers: [LearningController],
  providers: [LearningService],
})
export class LearningModule {}

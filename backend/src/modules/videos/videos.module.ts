import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assignment, AssignmentSchema } from 'src/modules/assignments/schemas/assignment.schema';
import { Progress, ProgressSchema } from 'src/modules/progress/schemas/progress.schema';
import { Question, QuestionSchema } from 'src/modules/questions/schemas/question.schema';
import { Response, ResponseSchema } from 'src/modules/responses/schemas/response.schema';
import { ProgressModule } from 'src/modules/progress/progress.module';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { Video, VideoSchema } from './schemas/video.schema';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Progress.name, schema: ProgressSchema },
      { name: Response.name, schema: ResponseSchema },
    ]),
    forwardRef(() => QuestionsModule),
    forwardRef(() => ProgressModule),
  ],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Response, ResponseSchema } from 'src/modules/responses/schemas/response.schema';
import { ProgressModule } from 'src/modules/progress/progress.module';
import { VideosModule } from 'src/modules/videos/videos.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { Question, QuestionSchema } from './schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: Response.name, schema: ResponseSchema },
    ]),
    forwardRef(() => VideosModule),
    forwardRef(() => ProgressModule),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}

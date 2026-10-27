import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { Response, ResponseSchema } from 'src/modules/responses/schemas/response.schema';
import { VideosModule } from 'src/modules/videos/videos.module';
import { ProgressService } from './progress.service';
import { Progress, ProgressSchema } from './schemas/progress.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Progress.name, schema: ProgressSchema },
      { name: Response.name, schema: ResponseSchema },
    ]),
    QuestionsModule,
    VideosModule,
  ],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}

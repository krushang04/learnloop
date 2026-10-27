import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Assignment, AssignmentSchema } from 'src/modules/assignments/schemas/assignment.schema';
import { Progress, ProgressSchema } from 'src/modules/progress/schemas/progress.schema';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { ResponsesModule } from 'src/modules/responses/responses.module';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';
import { Video, VideoSchema } from 'src/modules/videos/schemas/video.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: User.name, schema: UserSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Progress.name, schema: ProgressSchema },
    ]),
    QuestionsModule,
    ResponsesModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

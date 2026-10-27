import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionsModule } from 'src/modules/questions/questions.module';
import { ResponsesService } from './responses.service';
import { Response, ResponseSchema } from './schemas/response.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Response.name, schema: ResponseSchema }]),
    QuestionsModule,
  ],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuestionType } from 'src/common/enums';

export type ResponseDocument = HydratedDocument<Response>;

@Schema({ timestamps: true, collection: 'responses', toJSON: { virtuals: true } })
export class Response {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true, index: true })
  questionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  learnerId: Types.ObjectId;

  @Prop({ required: true, enum: QuestionType })
  questionType: QuestionType;

  @Prop({ type: [String], default: [] })
  selectedOptionKeys: string[];

  @Prop({ default: '', trim: true, maxlength: 2000 })
  answerText: string;

  @Prop({ required: true, default: false })
  isCorrect: boolean;

  @Prop({ default: 0, min: 0 })
  pointsAwarded: number;

  @Prop({ default: 1, min: 1 })
  attempts: number;

  @Prop({ type: Date, default: Date.now })
  answeredAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ResponseSchema = SchemaFactory.createForClass(Response);

ResponseSchema.index({ questionId: 1, learnerId: 1 }, { unique: true });

ResponseSchema.index({ videoId: 1, learnerId: 1 });

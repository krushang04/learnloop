import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuestionType } from 'src/common/enums';

export type QuestionDocument = HydratedDocument<Question>;

@Schema({ _id: false })
export class QuestionOption {
  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  text: string;
}

export const QuestionOptionSchema = SchemaFactory.createForClass(QuestionOption);

@Schema({ timestamps: true, collection: 'questions', toJSON: { virtuals: true } })
export class Question {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  timestampSeconds: number;

  @Prop({ required: true, enum: QuestionType })
  type: QuestionType;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  prompt: string;

  @Prop({ type: [QuestionOptionSchema], default: [] })
  options: QuestionOption[];

  @Prop({ type: [String], default: [] })
  correctOptionKeys: string[];

  @Prop({ type: [String], default: [] })
  acceptedAnswers: string[];

  @Prop({ default: 1, min: 0 })
  points: number;

  @Prop({ default: '', trim: true, maxlength: 1000 })
  explanation: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

QuestionSchema.index({ videoId: 1, timestampSeconds: 1 }, { unique: true });

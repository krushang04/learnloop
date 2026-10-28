import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ProgressStatus } from 'src/common/enums';

export type ProgressDocument = HydratedDocument<Progress>;

@Schema({ timestamps: true, collection: 'progress', toJSON: { virtuals: true } })
export class Progress {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  learnerId: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  lastPositionSeconds: number;

  @Prop({ default: 0, min: 0 })
  maxPositionSeconds: number;

  @Prop({ default: 0, min: 0, max: 100 })
  completionPercentage: number;

  @Prop({ required: true, enum: ProgressStatus, default: ProgressStatus.NOT_STARTED, index: true })
  status: ProgressStatus;

  @Prop({ default: 0, min: 0 })
  answeredQuestionCount: number;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastWatchedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const ProgressSchema = SchemaFactory.createForClass(Progress);

ProgressSchema.index({ videoId: 1, learnerId: 1 }, { unique: true });

ProgressSchema.index({ videoId: 1, status: 1 });

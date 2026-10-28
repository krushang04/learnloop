import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AssignmentDocument = HydratedDocument<Assignment>;

@Schema({ timestamps: true, collection: 'assignments', toJSON: { virtuals: true } })
export class Assignment {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  learnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  dueAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index({ videoId: 1, learnerId: 1 }, { unique: true });

AssignmentSchema.index({ learnerId: 1, createdAt: -1 });

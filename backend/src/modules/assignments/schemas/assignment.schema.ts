import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AssignmentDocument = HydratedDocument<Assignment>;

/** Join between a learner and a video. Its existence is what grants a learner
 *  read access to a video, so every learner-facing query goes through it. */
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

// A learner is assigned a given video at most once; the unique index makes a
// repeated bulk-assign idempotent instead of creating duplicates.
AssignmentSchema.index({ videoId: 1, learnerId: 1 }, { unique: true });
// "My assignments", newest first.
AssignmentSchema.index({ learnerId: 1, createdAt: -1 });

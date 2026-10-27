import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { QuestionType } from 'src/common/enums';

export type QuestionDocument = HydratedDocument<Question>;

/**
 * One selectable answer. `key` is a short stable id ("a", "b", ...) that the
 * learner's response stores, so editing an option's text later does not
 * invalidate already-submitted answers.
 */
@Schema({ _id: false })
export class QuestionOption {
  @Prop({ required: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  text: string;
}

export const QuestionOptionSchema = SchemaFactory.createForClass(QuestionOption);

/**
 * Questions live in their own collection rather than embedded in Video because
 * they are edited independently, queried on their own (reporting joins on
 * questionId) and a single video can accumulate many of them.
 */
@Schema({ timestamps: true, collection: 'questions', toJSON: { virtuals: true } })
export class Question {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  /** Playback position, in seconds, at which the video pauses and this appears. */
  @Prop({ required: true, min: 0 })
  timestampSeconds: number;

  @Prop({ required: true, enum: QuestionType })
  type: QuestionType;

  @Prop({ required: true, trim: true, maxlength: 1000 })
  prompt: string;

  /** Empty for SHORT_ANSWER. */
  @Prop({ type: [QuestionOptionSchema], default: [] })
  options: QuestionOption[];

  /** Option keys that count as correct. Empty for SHORT_ANSWER. */
  @Prop({ type: [String], default: [] })
  correctOptionKeys: string[];

  /**
   * Accepted answers for SHORT_ANSWER, compared case-insensitively after
   * trimming. Multiple entries let an admin accept synonyms.
   */
  @Prop({ type: [String], default: [] })
  acceptedAnswers: string[];

  @Prop({ default: 1, min: 0 })
  points: number;

  @Prop({ default: '', trim: true, maxlength: 1000 })
  explanation: string;

  /** When false the question is skipped during playback but history is kept. */
  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

// Serves both the player's "questions in playback order" fetch and the rule
// that two questions may not fire at the identical second on one video
// (they would race each other in the player).
QuestionSchema.index({ videoId: 1, timestampSeconds: 1 }, { unique: true });

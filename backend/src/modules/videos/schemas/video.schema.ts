import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { VideoStatus } from 'src/common/enums';

export type VideoDocument = HydratedDocument<Video>;

@Schema({
  timestamps: true,
  collection: 'videos',
  toJSON: { virtuals: true },
})
export class Video {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  description: string;

  @Prop({ default: '', trim: true })
  thumbnailUrl: string;

  @Prop({ required: true, trim: true })
  videoUrl: string;

  /**
   * Duration in seconds. The admin UI reads it out of the video file and fills
   * it in, and publishing is blocked until it is known, because completion
   * percentage has no denominator without it. Still guarded for 0 downstream,
   * since data can reach the database from the seed script too.
   */
  @Prop({ required: true, min: 0, default: 0 })
  durationSeconds: number;

  @Prop({ required: true, enum: VideoStatus, default: VideoStatus.DRAFT, index: true })
  status: VideoStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  tags: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);

// Admin library list: filter by status, newest first.
VideoSchema.index({ status: 1, createdAt: -1 });
// Admin search box.
VideoSchema.index({ title: 'text', description: 'text' });

VideoSchema.virtual('questionCount', {
  ref: 'Question',
  localField: '_id',
  foreignField: 'videoId',
  count: true,
});

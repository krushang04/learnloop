import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { COMPLETION_WATCH_THRESHOLD, ProgressStatus } from 'src/common/enums';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { Response, ResponseDocument } from 'src/modules/responses/schemas/response.schema';
import { VideosService } from 'src/modules/videos/videos.service';
import { Progress, ProgressDocument } from './schemas/progress.schema';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(Progress.name) private readonly progressModel: Model<ProgressDocument>,
    @InjectModel(Response.name) private readonly responseModel: Model<ResponseDocument>,
    private readonly questionsService: QuestionsService,
    // Circular by nature: videos recalculate progress when their duration
    // changes, and progress needs the video to know what to divide by.
    @Inject(forwardRef(() => VideosService))
    private readonly videosService: VideosService,
  ) {}

  /** Returns the learner's row, creating an empty one on first open. */
  async getOrCreate(videoId: string, learnerId: string): Promise<ProgressDocument> {
    const filter = {
      videoId: new Types.ObjectId(videoId),
      learnerId: new Types.ObjectId(learnerId),
    };

    return this.progressModel
      .findOneAndUpdate(
        filter,
        { $setOnInsert: { ...filter, status: ProgressStatus.NOT_STARTED } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /**
   * Autosave target. Called every few seconds during playback and on pause,
   * seek and unload, so it must be cheap and strictly monotonic in
   * `maxPositionSeconds` — rewinding to re-watch must never reduce completion.
   */
  async savePosition(videoId: string, learnerId: string, positionSeconds: number, reportedDuration?: number) {
    if (reportedDuration) {
      await this.videosService.backfillDuration(videoId, reportedDuration);
    }

    const video = await this.videosService.findByIdOrFail(videoId);
    const duration = video.durationSeconds || reportedDuration || 0;

    // Never trust a client-supplied position past the end of the video.
    const position = duration
      ? Math.min(Math.max(positionSeconds, 0), duration)
      : Math.max(positionSeconds, 0);

    const progress = await this.getOrCreate(videoId, learnerId);
    progress.lastPositionSeconds = position;
    progress.maxPositionSeconds = Math.max(progress.maxPositionSeconds, position);
    progress.lastWatchedAt = new Date();
    if (!progress.startedAt) progress.startedAt = new Date();

    await this.recalculate(progress, duration);
    return progress.save();
  }

  /**
   * Recomputes the derived fields from the two facts we actually store:
   * how far the learner has watched, and how many questions they have answered.
   *
   * Completion requires BOTH — watching to the end while skipping every
   * question is not completing the lesson.
   */
  async recalculate(progress: ProgressDocument, durationSeconds?: number): Promise<void> {
    const videoId = progress.videoId.toString();
    const duration =
      durationSeconds ?? (await this.videosService.findByIdOrFail(videoId)).durationSeconds;

    const [answeredCount, totalQuestions] = await Promise.all([
      this.responseModel
        .countDocuments({ videoId: progress.videoId, learnerId: progress.learnerId })
        .exec(),
      this.questionsService.countActiveForVideo(videoId),
    ]);

    progress.answeredQuestionCount = answeredCount;

    // Without a known duration we cannot express watch progress as a
    // percentage; report 0 rather than a misleading number.
    const watchRatio = duration > 0 ? Math.min(progress.maxPositionSeconds / duration, 1) : 0;
    progress.completionPercentage = Math.round(watchRatio * 100);

    const watchedEnough = duration > 0 && watchRatio >= COMPLETION_WATCH_THRESHOLD;
    const answeredAll = answeredCount >= totalQuestions;

    if (watchedEnough && answeredAll) {
      if (progress.status !== ProgressStatus.COMPLETED) {
        progress.status = ProgressStatus.COMPLETED;
        progress.completedAt = new Date();
      }
    } else if (progress.maxPositionSeconds > 0 || answeredCount > 0) {
      progress.status = ProgressStatus.IN_PROGRESS;
      progress.completedAt = null;
    } else {
      progress.status = ProgressStatus.NOT_STARTED;
    }
  }

  /**
   * Re-derives every learner's progress on one video.
   *
   * Progress is derived from the video's duration and its question count, so an
   * admin editing either of those silently invalidates every stored row. Without
   * this, the numbers stay stale until each learner happens to open the video
   * again, and the admin report shows figures that were true under the old
   * settings — the one place those figures are supposed to be trustworthy.
   *
   * Returns how many rows were touched, so the caller can tell the admin.
   */
  async recalculateForVideo(videoId: string): Promise<number> {
    const video = await this.videosService.findByIdOrFail(videoId);
    const rows = await this.progressModel
      .find({ videoId: new Types.ObjectId(videoId) })
      .exec();

    for (const row of rows) {
      // A saved position past the new end would resume a learner beyond the
      // video, so pull it back inside the new bounds first.
      if (video.durationSeconds > 0) {
        row.maxPositionSeconds = Math.min(row.maxPositionSeconds, video.durationSeconds);
        row.lastPositionSeconds = Math.min(row.lastPositionSeconds, video.durationSeconds);
      }
      await this.recalculate(row, video.durationSeconds);
      await row.save();
    }

    return rows.length;
  }

  /** Re-derives and persists after an answer is submitted. */
  async refreshAfterAnswer(videoId: string, learnerId: string): Promise<ProgressDocument> {
    const progress = await this.getOrCreate(videoId, learnerId);
    if (!progress.startedAt) progress.startedAt = new Date();
    await this.recalculate(progress);
    return progress.save();
  }

  async findForLearnerByVideoIds(
    learnerId: string,
    videoIds: Types.ObjectId[],
  ): Promise<Map<string, ProgressDocument>> {
    if (!videoIds.length) return new Map();
    const rows = await this.progressModel
      .find({ learnerId: new Types.ObjectId(learnerId), videoId: { $in: videoIds } })
      .exec();
    return new Map(rows.map((row) => [row.videoId.toString(), row]));
  }

  async findForVideo(videoId: string) {
    return this.progressModel
      .find({ videoId: new Types.ObjectId(videoId) })
      .lean()
      .exec();
  }

  toPublicShape(progress: ProgressDocument | undefined | null) {
    if (!progress) {
      return {
        lastPositionSeconds: 0,
        maxPositionSeconds: 0,
        completionPercentage: 0,
        status: ProgressStatus.NOT_STARTED,
        answeredQuestionCount: 0,
        startedAt: null,
        completedAt: null,
        lastWatchedAt: null,
      };
    }
    return {
      lastPositionSeconds: progress.lastPositionSeconds,
      maxPositionSeconds: progress.maxPositionSeconds,
      completionPercentage: progress.completionPercentage,
      status: progress.status,
      answeredQuestionCount: progress.answeredQuestionCount,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      lastWatchedAt: progress.lastWatchedAt,
    };
  }
}

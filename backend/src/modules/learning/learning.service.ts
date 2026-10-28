import { Injectable } from '@nestjs/common';
import { ProgressStatus, VideoStatus } from 'src/common/enums';
import { escapeRegex } from 'src/common/dto/pagination.dto';
import { AssignmentsService } from 'src/modules/assignments/assignments.service';
import { ProgressService } from 'src/modules/progress/progress.service';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { SubmitAnswerDto } from 'src/modules/questions/dto/submit-answer.dto';
import { ResponsesService } from 'src/modules/responses/responses.service';
import { UpdateProgressDto } from 'src/modules/progress/dto/update-progress.dto';
import { VideosService } from 'src/modules/videos/videos.service';
import { LearnerQueryDto } from './dto/learner-query.dto';

@Injectable()
export class LearningService {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly videosService: VideosService,
    private readonly questionsService: QuestionsService,
    private readonly progressService: ProgressService,
    private readonly responsesService: ResponsesService,
  ) {}

  async listAssignedVideos(learnerId: string, query: LearnerQueryDto) {
    const assignments = await this.assignmentsService.findForLearner(learnerId);

    const visible = assignments.filter((a) => a.videoId && typeof a.videoId === 'object');

    const videoIds = visible.map((a: any) => a.videoId._id);
    const progressByVideo = await this.progressService.findForLearnerByVideoIds(
      learnerId,
      videoIds,
    );
    const questionCounts = await this.questionsService.countByVideoIds(videoIds);

    let items = visible.map((assignment: any) => {
      const video = assignment.videoId;
      const progress = progressByVideo.get(video._id.toString());
      return {
        assignmentId: assignment._id.toString(),
        assignedAt: assignment.createdAt,
        dueAt: assignment.dueAt,
        video: {
          id: video._id.toString(),
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          durationSeconds: video.durationSeconds,
          tags: video.tags ?? [],
        },
        questionCount: questionCounts.get(video._id.toString()) ?? 0,
        progress: this.progressService.toPublicShape(progress),
      };
    });

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      items = items.filter((i) => rx.test(i.video.title) || rx.test(i.video.description));
    }
    if (query.status) {
      items = items.filter((i) => i.progress.status === query.status);
    }

    return {
      items,
      summary: {
        total: items.length,
        completed: items.filter((i) => i.progress.status === ProgressStatus.COMPLETED).length,
        inProgress: items.filter((i) => i.progress.status === ProgressStatus.IN_PROGRESS).length,
        notStarted: items.filter((i) => i.progress.status === ProgressStatus.NOT_STARTED).length,
      },
    };
  }

  async getPlayerPayload(videoId: string, learnerId: string) {
    await this.assignmentsService.assertAssigned(videoId, learnerId);
    const video = await this.videosService.assertPublished(videoId);

    const [questions, progress, responses] = await Promise.all([
      this.questionsService.findByVideoId(videoId, { includeAnswers: false, activeOnly: true }),
      this.progressService.getOrCreate(videoId, learnerId),
      this.responsesService.findForLearnerAndVideo(videoId, learnerId),
    ]);

    return {
      video: {
        id: video._id.toString(),
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        videoUrl: video.videoUrl,
        durationSeconds: video.durationSeconds,
        tags: video.tags,
        status: video.status as VideoStatus,
      },
      questions,
      progress: this.progressService.toPublicShape(progress),

      answers: responses.map((r) => ({
        questionId: r.questionId.toString(),
        selectedOptionKeys: r.selectedOptionKeys,
        answerText: r.answerText,
        isCorrect: r.isCorrect,
        attempts: r.attempts,
        answeredAt: r.answeredAt,
      })),
    };
  }

  async saveProgress(videoId: string, learnerId: string, dto: UpdateProgressDto) {
    await this.assignmentsService.assertAssigned(videoId, learnerId);
    await this.videosService.assertPublished(videoId);

    const progress = await this.progressService.savePosition(
      videoId,
      learnerId,
      dto.positionSeconds,
      dto.durationSeconds,
    );
    return this.progressService.toPublicShape(progress);
  }

  async submitAnswer(
    videoId: string,
    questionId: string,
    learnerId: string,
    dto: SubmitAnswerDto,
  ) {
    await this.assignmentsService.assertAssigned(videoId, learnerId);
    await this.videosService.assertPublished(videoId);

    const current = await this.progressService.getOrCreate(videoId, learnerId);

    const result = await this.responsesService.submit(
      videoId,
      questionId,
      learnerId,
      dto,
      current.maxPositionSeconds,
    );
    const progress = await this.progressService.refreshAfterAnswer(videoId, learnerId);

    return { result, progress: this.progressService.toPublicShape(progress) };
  }
}

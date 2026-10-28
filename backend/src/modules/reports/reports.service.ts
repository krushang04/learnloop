import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProgressStatus, VideoStatus } from 'src/common/enums';
import { Assignment, AssignmentDocument } from 'src/modules/assignments/schemas/assignment.schema';
import { Progress, ProgressDocument } from 'src/modules/progress/schemas/progress.schema';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { ResponsesService } from 'src/modules/responses/responses.service';
import { User, UserDocument } from 'src/modules/users/schemas/user.schema';
import { Video, VideoDocument } from 'src/modules/videos/schemas/video.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Progress.name) private readonly progressModel: Model<ProgressDocument>,
    private readonly questionsService: QuestionsService,
    private readonly responsesService: ResponsesService,
  ) {}

  async overview() {
    const [totalVideos, publishedVideos, totalLearners, totalAssignments, statusCounts] =
      await Promise.all([
        this.videoModel.countDocuments().exec(),
        this.videoModel.countDocuments({ status: VideoStatus.PUBLISHED }).exec(),
        this.userModel.countDocuments({ role: 'learner' }).exec(),
        this.assignmentModel.countDocuments().exec(),
        this.progressModel.aggregate<{ _id: ProgressStatus; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
      ]);

    const byStatus = new Map(statusCounts.map((row) => [row._id, row.count]));
    const completed = byStatus.get(ProgressStatus.COMPLETED) ?? 0;
    const inProgress = byStatus.get(ProgressStatus.IN_PROGRESS) ?? 0;

    return {
      totalVideos,
      publishedVideos,
      draftVideos: totalVideos - publishedVideos,
      totalLearners,
      totalAssignments,
      completed,
      inProgress,

      notStarted: Math.max(totalAssignments - completed - inProgress, 0),
      completionRate: totalAssignments ? Math.round((completed / totalAssignments) * 100) : 0,
    };
  }

  async videoReport(videoId: string) {
    const video = await this.videoModel.findById(videoId).lean().exec();
    if (!video) throw new NotFoundException('Video not found');

    const [assignments, progressRows, scores, questionCount] = await Promise.all([
      this.assignmentModel
        .find({ videoId: new Types.ObjectId(videoId) })
        .populate('learnerId', 'name email')
        .lean()
        .exec(),
      this.progressModel.find({ videoId: new Types.ObjectId(videoId) }).lean().exec(),
      this.responsesService.scoreSummaryForVideo(videoId),
      this.questionsService.countActiveForVideo(videoId),
    ]);

    const progressByLearner = new Map(progressRows.map((p) => [p.learnerId.toString(), p]));
    const scoreByLearner = new Map(scores.map((s) => [s._id.toString(), s]));

    const rows = assignments

      .filter((a: any) => a.learnerId)
      .map((assignment: any) => {
        const learnerId = assignment.learnerId._id.toString();
        const progress = progressByLearner.get(learnerId);
        const score = scoreByLearner.get(learnerId);

        return {
          learner: {
            id: learnerId,
            name: assignment.learnerId.name,
            email: assignment.learnerId.email,
          },
          assignedAt: assignment.createdAt,
          dueAt: assignment.dueAt,
          status: progress?.status ?? ProgressStatus.NOT_STARTED,
          completionPercentage: progress?.completionPercentage ?? 0,
          lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
          lastWatchedAt: progress?.lastWatchedAt ?? null,
          completedAt: progress?.completedAt ?? null,
          answered: score?.total ?? 0,
          correct: score?.correct ?? 0,
          pointsAwarded: score?.points ?? 0,
          accuracy: score?.total ? Math.round((score.correct / score.total) * 100) : null,
        };
      });

    const completedCount = rows.filter((r) => r.status === ProgressStatus.COMPLETED).length;

    return {
      video: {
        id: video._id.toString(),
        title: video.title,
        status: video.status,
        durationSeconds: video.durationSeconds,
        questionCount,
      },
      summary: {
        assigned: rows.length,
        completed: completedCount,
        inProgress: rows.filter((r) => r.status === ProgressStatus.IN_PROGRESS).length,
        notStarted: rows.filter((r) => r.status === ProgressStatus.NOT_STARTED).length,
        completionRate: rows.length ? Math.round((completedCount / rows.length) * 100) : 0,
        averageCompletion: rows.length
          ? Math.round(rows.reduce((sum, r) => sum + r.completionPercentage, 0) / rows.length)
          : 0,
      },
      rows,
    };
  }

  async learnerResponses(videoId: string, learnerId: string) {
    const [video, learner] = await Promise.all([
      this.videoModel.findById(videoId).lean().exec(),
      this.userModel.findById(learnerId).lean().exec(),
    ]);
    if (!video) throw new NotFoundException('Video not found');
    if (!learner) throw new NotFoundException('Learner not found');

    const [questions, responses, progress] = await Promise.all([
      this.questionsService.findByVideoId(videoId, { includeAnswers: true }),
      this.responsesService.findForLearnerAndVideo(videoId, learnerId),
      this.progressModel
        .findOne({
          videoId: new Types.ObjectId(videoId),
          learnerId: new Types.ObjectId(learnerId),
        })
        .lean()
        .exec(),
    ]);

    const responseByQuestion = new Map(responses.map((r) => [r.questionId.toString(), r]));

    const items = questions.map((question: any) => {
      const response = responseByQuestion.get(question._id.toString());
      const optionText = (key: string) =>
        question.options.find((o: any) => o.key === key)?.text ?? key;

      return {
        question: {
          id: question._id.toString(),
          prompt: question.prompt,
          type: question.type,
          timestampSeconds: question.timestampSeconds,
          points: question.points,
          options: question.options,
          correctOptionKeys: question.correctOptionKeys,
          correctOptionTexts: question.correctOptionKeys.map(optionText),
          acceptedAnswers: question.acceptedAnswers,
        },
        response: response
          ? {
              selectedOptionKeys: response.selectedOptionKeys,
              selectedOptionTexts: response.selectedOptionKeys.map(optionText),
              answerText: response.answerText,
              isCorrect: response.isCorrect,
              pointsAwarded: response.pointsAwarded,
              attempts: response.attempts,
              answeredAt: response.answeredAt,
            }
          : null,
      };
    });

    const answered = items.filter((i) => i.response);

    return {
      video: { id: video._id.toString(), title: video.title, durationSeconds: video.durationSeconds },
      learner: { id: learner._id.toString(), name: learner.name, email: learner.email },
      progress: {
        status: progress?.status ?? ProgressStatus.NOT_STARTED,
        completionPercentage: progress?.completionPercentage ?? 0,
        lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
        lastWatchedAt: progress?.lastWatchedAt ?? null,
        completedAt: progress?.completedAt ?? null,
      },
      summary: {
        totalQuestions: items.length,
        answered: answered.length,
        correct: answered.filter((i) => i.response!.isCorrect).length,
        pointsAwarded: answered.reduce((sum, i) => sum + i.response!.pointsAwarded, 0),
        pointsPossible: items.reduce((sum, i) => sum + i.question.points, 0),
      },
      items,
    };
  }
}

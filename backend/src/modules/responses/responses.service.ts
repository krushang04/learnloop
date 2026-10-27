import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubmitAnswerDto } from 'src/modules/questions/dto/submit-answer.dto';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { Response, ResponseDocument } from './schemas/response.schema';

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  /** Revealed only after the learner has answered. */
  explanation: string;
  attempts: number;
}

@Injectable()
export class ResponsesService {
  constructor(
    @InjectModel(Response.name) private readonly responseModel: Model<ResponseDocument>,
    private readonly questionsService: QuestionsService,
  ) {}

  /**
   * Grades and stores an answer. Upserts on (learner, question) so a re-answer
   * replaces the previous one and increments `attempts`, which keeps reporting
   * a direct lookup rather than a "latest of many" aggregation.
   */
  async submit(
    videoId: string,
    questionId: string,
    learnerId: string,
    dto: SubmitAnswerDto,
  ): Promise<GradedAnswer> {
    const question = await this.questionsService.findByIdOrFail(questionId);

    // Guards against a learner POSTing another video's question id to this route.
    if (question.videoId.toString() !== videoId) {
      throw new BadRequestException('This question does not belong to the given video');
    }
    if (!question.isActive) {
      throw new BadRequestException('This question is no longer active');
    }

    const { isCorrect, pointsAwarded } = this.questionsService.grade(question, dto);

    const saved = await this.responseModel
      .findOneAndUpdate(
        {
          questionId: question._id,
          learnerId: new Types.ObjectId(learnerId),
        },
        {
          $set: {
            videoId: question.videoId,
            questionType: question.type,
            selectedOptionKeys: dto.selectedOptionKeys ?? [],
            answerText: dto.answerText ?? '',
            isCorrect,
            pointsAwarded,
            answeredAt: new Date(),
          },
          $inc: { attempts: 1 },
          $setOnInsert: {
            questionId: question._id,
            learnerId: new Types.ObjectId(learnerId),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return {
      questionId: question._id.toString(),
      isCorrect,
      pointsAwarded,
      explanation: question.explanation,
      attempts: saved.attempts,
    };
  }

  /** The learner's own answers for one video — used to rehydrate the player
   *  after a refresh so already-answered questions do not fire again. */
  async findForLearnerAndVideo(videoId: string, learnerId: string) {
    return this.responseModel
      .find({
        videoId: new Types.ObjectId(videoId),
        learnerId: new Types.ObjectId(learnerId),
      })
      .lean()
      .exec();
  }

  async findForVideo(videoId: string) {
    return this.responseModel
      .find({ videoId: new Types.ObjectId(videoId) })
      .lean()
      .exec();
  }

  async scoreSummaryForVideo(videoId: string) {
    return this.responseModel.aggregate<{
      _id: Types.ObjectId;
      correct: number;
      total: number;
      points: number;
    }>([
      { $match: { videoId: new Types.ObjectId(videoId) } },
      {
        $group: {
          _id: '$learnerId',
          correct: { $sum: { $cond: ['$isCorrect', 1, 0] } },
          total: { $sum: 1 },
          points: { $sum: '$pointsAwarded' },
        },
      },
    ]);
  }
}

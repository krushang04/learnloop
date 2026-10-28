import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuestionType } from 'src/common/enums';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Response, ResponseDocument } from 'src/modules/responses/schemas/response.schema';
import { Question, QuestionDocument } from './schemas/question.schema';

export interface LearnerQuestion {
  id: string;
  timestampSeconds: number;
  type: QuestionType;
  prompt: string;
  options: { key: string; text: string }[];
  points: number;
}

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(Response.name) private readonly responseModel: Model<ResponseDocument>,
  ) {}

  async create(videoId: string, dto: CreateQuestionDto): Promise<QuestionDocument> {
    this.assertShapeIsValid(dto.type, dto);
    return this.questionModel.create({
      ...this.normalize(dto),
      videoId: new Types.ObjectId(videoId),
    });
  }

  async findByVideoId(
    videoId: string,
    opts: { includeAnswers: boolean; activeOnly?: boolean },
  ): Promise<any[]> {
    const filter: Record<string, unknown> = { videoId: new Types.ObjectId(videoId) };
    if (opts.activeOnly) filter.isActive = true;

    const questions = await this.questionModel
      .find(filter)
      .sort({ timestampSeconds: 1 })
      .lean()
      .exec();

    return opts.includeAnswers
      ? questions.map((q) => ({ ...q, id: q._id.toString() }))
      : questions.map((q) => this.toLearnerShape(q));
  }

  async findByIdOrFail(id: string): Promise<QuestionDocument> {
    const question = await this.questionModel.findById(id).exec();
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async update(id: string, dto: UpdateQuestionDto): Promise<QuestionDocument> {
    const question = await this.findByIdOrFail(id);
    const merged = { ...question.toObject(), ...dto };
    this.assertShapeIsValid(merged.type, merged);

    Object.assign(question, this.normalize(merged as CreateQuestionDto));
    return question.save();
  }

  async remove(id: string): Promise<Types.ObjectId> {
    const question = await this.findByIdOrFail(id);
    await this.responseModel.deleteMany({ questionId: question._id }).exec();
    await this.questionModel.deleteOne({ _id: question._id }).exec();
    return question.videoId;
  }

  async countByVideoIds(videoIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (!videoIds.length) return new Map();
    const rows = await this.questionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { videoId: { $in: videoIds }, isActive: true } },
      { $group: { _id: '$videoId', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [r._id.toString(), r.count]));
  }

  async countActiveForVideo(videoId: string): Promise<number> {
    return this.questionModel
      .countDocuments({ videoId: new Types.ObjectId(videoId), isActive: true })
      .exec();
  }

  async findBeyondTimestamp(videoId: string, seconds: number) {
    return this.questionModel
      .find({ videoId: new Types.ObjectId(videoId), timestampSeconds: { $gt: seconds } })
      .select('timestampSeconds prompt')
      .lean()
      .exec();
  }

  async findInvalidForPublish(videoId: string) {
    return this.questionModel
      .find({
        videoId: new Types.ObjectId(videoId),
        isActive: true,
        $or: [
          {
            type: { $in: [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE] },
            correctOptionKeys: { $size: 0 },
          },
          { type: QuestionType.SHORT_ANSWER, acceptedAnswers: { $size: 0 } },
        ],
      })
      .select('prompt timestampSeconds')
      .lean()
      .exec();
  }

  grade(
    question: QuestionDocument,
    answer: { selectedOptionKeys?: string[]; answerText?: string },
  ): { isCorrect: boolean; pointsAwarded: number } {
    let isCorrect = false;

    if (question.type === QuestionType.SHORT_ANSWER) {
      const given = (answer.answerText ?? '').trim().toLowerCase();
      if (!given) throw new BadRequestException('An answer is required');
      isCorrect = question.acceptedAnswers.some(
        (accepted) => accepted.trim().toLowerCase() === given,
      );
    } else {
      const selected = answer.selectedOptionKeys ?? [];
      if (!selected.length) throw new BadRequestException('Select at least one option');

      const validKeys = new Set(question.options.map((o) => o.key));
      const unknown = selected.filter((key) => !validKeys.has(key));
      if (unknown.length) {
        throw new BadRequestException(`Unknown option(s): ${unknown.join(', ')}`);
      }
      if (question.type === QuestionType.SINGLE_CHOICE && selected.length > 1) {
        throw new BadRequestException('This question accepts only one option');
      }

      const picked = new Set(selected);
      const expected = new Set(question.correctOptionKeys);
      isCorrect =
        picked.size === expected.size && [...expected].every((key) => picked.has(key));
    }

    return { isCorrect, pointsAwarded: isCorrect ? question.points : 0 };
  }

  toLearnerShape(question: Record<string, any>): LearnerQuestion {
    return {
      id: question._id.toString(),
      timestampSeconds: question.timestampSeconds,
      type: question.type,
      prompt: question.prompt,
      options: (question.options ?? []).map((o: any) => ({ key: o.key, text: o.text })),
      points: question.points,
    };
  }

  private assertShapeIsValid(type: QuestionType, dto: Partial<CreateQuestionDto>): void {
    const options = dto.options ?? [];
    const correctKeys = dto.correctOptionKeys ?? [];

    if (type === QuestionType.SHORT_ANSWER) {
      if (options.length) {
        throw new BadRequestException('A short-answer question must not have options');
      }
      if (!(dto.acceptedAnswers ?? []).length) {
        throw new BadRequestException('Provide at least one accepted answer');
      }
      return;
    }

    if (options.length < 2) {
      throw new BadRequestException('A choice question needs at least two options');
    }

    const keys = options.map((o) => o.key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Option keys must be unique within a question');
    }

    if (!correctKeys.length) {
      throw new BadRequestException('Mark at least one option as correct');
    }
    const unknown = correctKeys.filter((key) => !keys.includes(key));
    if (unknown.length) {
      throw new BadRequestException(
        `correctOptionKeys refers to option(s) that do not exist: ${unknown.join(', ')}`,
      );
    }
    if (type === QuestionType.SINGLE_CHOICE && correctKeys.length !== 1) {
      throw new BadRequestException('A single-choice question must have exactly one correct option');
    }
    if (type === QuestionType.MULTIPLE_CHOICE && correctKeys.length < 2) {
      throw new BadRequestException(
        'A multiple-choice question must have at least two correct options - use single choice otherwise',
      );
    }
  }

  private normalize(dto: CreateQuestionDto) {
    const isShortAnswer = dto.type === QuestionType.SHORT_ANSWER;
    return {
      timestampSeconds: Math.round(dto.timestampSeconds),
      type: dto.type,
      prompt: dto.prompt,
      options: isShortAnswer ? [] : (dto.options ?? []),
      correctOptionKeys: isShortAnswer ? [] : (dto.correctOptionKeys ?? []),
      acceptedAnswers: isShortAnswer ? (dto.acceptedAnswers ?? []) : [],
      points: dto.points ?? 1,
      explanation: dto.explanation ?? '',
      isActive: dto.isActive ?? true,
    };
  }
}

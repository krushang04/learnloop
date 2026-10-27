import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { buildPaginationMeta, escapeRegex } from 'src/common/dto/pagination.dto';
import { VideoStatus } from 'src/common/enums';
import { QuestionsService } from 'src/modules/questions/questions.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { QueryVideoDto } from './dto/query-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Assignment, AssignmentDocument } from 'src/modules/assignments/schemas/assignment.schema';
import { Progress, ProgressDocument } from 'src/modules/progress/schemas/progress.schema';
import { Question, QuestionDocument } from 'src/modules/questions/schemas/question.schema';
import { Response, ResponseDocument } from 'src/modules/responses/schemas/response.schema';
import { Video, VideoDocument } from './schemas/video.schema';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectModel(Video.name) private readonly videoModel: Model<VideoDocument>,
    @InjectModel(Question.name) private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    @InjectModel(Progress.name) private readonly progressModel: Model<ProgressDocument>,
    @InjectModel(Response.name) private readonly responseModel: Model<ResponseDocument>,
    @InjectConnection() private readonly connection: Connection,
    @Inject(forwardRef(() => QuestionsService))
    private readonly questionsService: QuestionsService,
  ) {}

  async create(dto: CreateVideoDto, adminId: string): Promise<VideoDocument> {
    return this.videoModel.create({
      ...dto,
      description: dto.description ?? '',
      thumbnailUrl: dto.thumbnailUrl ?? '',
      durationSeconds: dto.durationSeconds ?? 0,
      status: dto.status ?? VideoStatus.DRAFT,
      tags: dto.tags ?? [],
      createdBy: new Types.ObjectId(adminId),
    });
  }

  async findAll(query: QueryVideoDto) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.tag) filter.tags = query.tag.toLowerCase();
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }

    const [items, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('createdBy', 'name email')
        .lean()
        .exec(),
      this.videoModel.countDocuments(filter).exec(),
    ]);

    // One grouped count instead of N queries while rendering the library list.
    const counts = await this.questionsService.countByVideoIds(items.map((v) => v._id));

    return {
      items: items.map((video) => ({
        ...video,
        id: video._id.toString(),
        questionCount: counts.get(video._id.toString()) ?? 0,
      })),
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async findByIdOrFail(id: string): Promise<VideoDocument> {
    const video = await this.videoModel.findById(id).exec();
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async findDetail(id: string) {
    const video = await this.videoModel.findById(id).populate('createdBy', 'name email').lean().exec();
    if (!video) throw new NotFoundException('Video not found');

    const questions = await this.questionsService.findByVideoId(id, { includeAnswers: true });
    return { ...video, id: video._id.toString(), questions };
  }

  async update(id: string, dto: UpdateVideoDto): Promise<VideoDocument> {
    const video = await this.findByIdOrFail(id);

    // Shortening a video can strand questions past the new end, where they
    // would never fire. Block it and tell the admin exactly what is in the way.
    if (dto.durationSeconds !== undefined && dto.durationSeconds < video.durationSeconds) {
      const stranded = await this.questionsService.findBeyondTimestamp(id, dto.durationSeconds);
      if (stranded.length) {
        throw new BadRequestException(
          `Cannot shorten this video to ${dto.durationSeconds}s: ${stranded.length} question(s) are placed after that point. Move or delete them first.`,
        );
      }
    }

    Object.assign(video, dto);
    return video.save();
  }

  async setStatus(id: string, status: VideoStatus): Promise<VideoDocument> {
    const video = await this.findByIdOrFail(id);

    if (status === VideoStatus.PUBLISHED) {
      // Publishing is what makes a video visible to learners, so the data has
      // to be complete enough to actually play and score.
      if (!video.durationSeconds) {
        throw new BadRequestException(
          'Set the video duration before publishing — completion tracking depends on it.',
        );
      }
      const invalid = await this.questionsService.findInvalidForPublish(id);
      if (invalid.length) {
        throw new BadRequestException(
          `Cannot publish: ${invalid.length} question(s) have no correct answer configured.`,
        );
      }
    }

    video.status = status;
    return video.save();
  }

  /**
   * Deletes a video and everything that hangs off it. Without the cascade, the
   * questions, assignments, progress rows and responses would become orphans
   * that still show up in reporting joins.
   *
   * Runs in a transaction when the deployment supports one (replica set). A
   * standalone mongod — the default for local Docker — cannot do transactions,
   * so we fall back to sequential deletes, ordered children-first so a failure
   * part-way leaves the video reachable rather than orphaning its children.
   */
  async remove(id: string): Promise<void> {
    const video = await this.findByIdOrFail(id);
    const videoId = video._id;

    const deleteAll = async (session?: ClientSession) => {
      const opts = session ? { session } : {};
      await this.responseModel.deleteMany({ videoId }, opts).exec();
      await this.progressModel.deleteMany({ videoId }, opts).exec();
      await this.assignmentModel.deleteMany({ videoId }, opts).exec();
      await this.questionModel.deleteMany({ videoId }, opts).exec();
      await this.videoModel.deleteOne({ _id: videoId }, opts).exec();
    };

    let session: ClientSession | null = null;
    try {
      session = await this.connection.startSession();
      await session.withTransaction(() => deleteAll(session!));
    } catch (error) {
      if (!this.isUnsupportedTransactionError(error)) throw error;
      this.logger.warn(
        'MongoDB is running standalone, so the delete cascade ran without a transaction.',
      );
      await deleteAll();
    } finally {
      await session?.endSession();
    }
  }

  private isUnsupportedTransactionError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('Transaction numbers are only allowed') ||
      message.includes('replica set') ||
      message.includes('IllegalOperation')
    );
  }

  /** Called by the learner player once the browser knows the real duration. */
  async backfillDuration(id: string, durationSeconds: number): Promise<void> {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;
    await this.videoModel
      .updateOne(
        { _id: id, $or: [{ durationSeconds: 0 }, { durationSeconds: { $exists: false } }] },
        { $set: { durationSeconds: Math.round(durationSeconds) } },
      )
      .exec();
  }

  async assertPublished(id: string): Promise<VideoDocument> {
    const video = await this.findByIdOrFail(id);
    if (video.status !== VideoStatus.PUBLISHED) {
      throw new NotFoundException('This video is not currently available');
    }
    return video;
  }
}

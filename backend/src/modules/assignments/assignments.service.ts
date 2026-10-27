import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VideoStatus } from 'src/common/enums';
import { UsersService } from 'src/modules/users/users.service';
import { VideosService } from 'src/modules/videos/videos.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { Assignment, AssignmentDocument } from './schemas/assignment.schema';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private readonly assignmentModel: Model<AssignmentDocument>,
    private readonly usersService: UsersService,
    private readonly videosService: VideosService,
  ) {}

  /**
   * Bulk-assign. Idempotent: re-assigning someone who already has the video is
   * a no-op rather than an error, so an admin can safely add one learner to an
   * existing cohort by re-submitting the whole list.
   */
  async assign(videoId: string, dto: CreateAssignmentDto, adminId: string) {
    await this.videosService.findByIdOrFail(videoId);
    const learnerIds = await this.usersService.assertLearnersExist(dto.learnerIds);

    const result = await this.assignmentModel.bulkWrite(
      learnerIds.map((learnerId) => ({
        updateOne: {
          filter: { videoId: new Types.ObjectId(videoId), learnerId },
          update: {
            $setOnInsert: {
              videoId: new Types.ObjectId(videoId),
              learnerId,
              assignedBy: new Types.ObjectId(adminId),
            },
            $set: { dueAt: dto.dueAt ?? null },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );

    return {
      requested: learnerIds.length,
      newlyAssigned: result.upsertedCount,
      alreadyAssigned: learnerIds.length - result.upsertedCount,
    };
  }

  async listForVideo(videoId: string) {
    await this.videosService.findByIdOrFail(videoId);
    return this.assignmentModel
      .find({ videoId: new Types.ObjectId(videoId) })
      .populate('learnerId', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async unassign(videoId: string, learnerId: string): Promise<void> {
    const result = await this.assignmentModel
      .deleteOne({
        videoId: new Types.ObjectId(videoId),
        learnerId: new Types.ObjectId(learnerId),
      })
      .exec();

    if (!result.deletedCount) {
      throw new NotFoundException('This learner is not assigned to this video');
    }
    // Progress and responses are intentionally kept: if the learner is
    // re-assigned later, their history is still there, and the admin report
    // for past attempts stays intact.
  }

  /** Access check used by every learner-facing route. */
  async assertAssigned(videoId: string, learnerId: string): Promise<AssignmentDocument> {
    const assignment = await this.assignmentModel
      .findOne({
        videoId: new Types.ObjectId(videoId),
        learnerId: new Types.ObjectId(learnerId),
      })
      .exec();

    if (!assignment) {
      throw new ForbiddenException('This video has not been assigned to you');
    }
    return assignment;
  }

  async findVideoIdsForLearner(learnerId: string): Promise<Types.ObjectId[]> {
    const rows = await this.assignmentModel
      .find({ learnerId: new Types.ObjectId(learnerId) })
      .select('videoId')
      .lean()
      .exec();
    return rows.map((r) => r.videoId);
  }

  async findForLearner(learnerId: string) {
    return this.assignmentModel
      .find({ learnerId: new Types.ObjectId(learnerId) })
      .populate({
        path: 'videoId',
        // A video pulled back into draft disappears from the learner's list
        // without losing the assignment record.
        match: { status: VideoStatus.PUBLISHED },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async countForVideo(videoId: string): Promise<number> {
    return this.assignmentModel.countDocuments({ videoId: new Types.ObjectId(videoId) }).exec();
  }
}

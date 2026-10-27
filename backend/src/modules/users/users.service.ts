import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { PaginationQueryDto, buildPaginationMeta, escapeRegex } from 'src/common/dto/pagination.dto';
import { UserRole } from 'src/common/enums';
import { User, UserDocument } from './schemas/user.schema';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<UserDocument> {
    const existing = await this.userModel.exists({ email: input.email });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    return this.userModel.create({
      name: input.name,
      email: input.email,
      password: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
      role: input.role ?? UserRole.LEARNER,
    });
  }

  /** Includes the normally-hidden password hash; for login only. */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).select('+password').exec();
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdOrFail(id: string | Types.ObjectId): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Validates that every id exists and is a learner — used before assigning videos. */
  async assertLearnersExist(ids: string[]): Promise<Types.ObjectId[]> {
    const unique = [...new Set(ids)];
    const learners = await this.userModel
      .find({ _id: { $in: unique }, role: UserRole.LEARNER, isActive: true })
      .select('_id')
      .exec();

    if (learners.length !== unique.length) {
      const found = new Set(learners.map((l) => l._id.toString()));
      const missing = unique.filter((id) => !found.has(id));
      throw new NotFoundException(
        `These learner ids are unknown or inactive: ${missing.join(', ')}`,
      );
    }
    return learners.map((l) => l._id);
  }

  async findAll(query: PaginationQueryDto, role?: UserRole) {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [items, total] = await Promise.all([
      this.userModel.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.limit).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { items, meta: buildPaginationMeta(total, query.page, query.limit) };
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

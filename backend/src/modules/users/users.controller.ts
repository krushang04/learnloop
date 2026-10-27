import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Paginated } from 'src/common/interceptors/transform.interceptor';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('learners')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List learners (admin)',
    description: 'Backs the learner picker in the assignment dialog. Supports ?search=.',
  })
  async listLearners(@Query() query: PaginationQueryDto) {
    const { items, meta } = await this.usersService.findAll(query, UserRole.LEARNER);
    return new Paginated(items, meta);
  }
}

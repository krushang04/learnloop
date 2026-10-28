import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Paginated } from 'src/common/interceptors/transform.interceptor';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { ApiAuthErrors } from 'src/common/decorators/api-responses.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiAuthErrors()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('learners')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List learners (admin)',
    description: 'Backs the learner picker in the assignment dialog. Supports ?search=.',
  })
  @ApiResponse({
    status: 200,
    description: 'A page of active learners. Password hashes are never included.',
  })
  async listLearners(@Query() query: PaginationQueryDto) {
    const { items, meta } = await this.usersService.findAll(query, UserRole.LEARNER);
    return new Paginated(items, meta);
  }
}

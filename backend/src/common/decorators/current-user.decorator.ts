import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserRole } from 'src/common/enums';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user as AuthUser;
    return data ? user?.[data] : user;
  },
);

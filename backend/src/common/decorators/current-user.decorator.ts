import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../../database/models/index.js';

export interface AuthenticatedUser {
  sub: number;
  identifier: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

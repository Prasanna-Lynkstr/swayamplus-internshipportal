import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * For routes that are public but need to know WHO is asking, if anyone —
 * e.g. GET /internships/:id, where a published listing is visible to
 * everyone but a draft/closed one should only be visible to its owning
 * employer or an admin. Unlike JwtAuthGuard, this never throws on a
 * missing/invalid token; it just leaves req.user as null.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}

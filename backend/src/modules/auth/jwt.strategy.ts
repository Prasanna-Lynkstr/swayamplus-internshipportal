import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { USER_MODEL } from '../../database/database.constants.js';
import { User } from '../../database/models/index.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(USER_MODEL) private readonly userModel: typeof User,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // No fallback: must match the secret AuthModule signs tokens with — see
      // the comment there on why this fails startup instead of defaulting.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.userModel.findByPk(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return { sub: user.id, identifier: user.identifier, role: user.role };
  }
}

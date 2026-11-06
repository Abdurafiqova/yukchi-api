import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser | undefined>(
    _err: unknown,
    user: AuthenticatedUser | false | null,
  ): TUser {
    return (user || undefined) as TUser;
  }
}

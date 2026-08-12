import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AppException } from '../common/app-exception';
import type { RequestWithAdventure } from './session.guard';

// SessionGuard 다음 순서로 적용: @UseGuards(SessionGuard, AdminGuard) (3.4)
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithAdventure>();
    if (!req.adventure?.isAdmin) {
      throw new AppException(
        403,
        'FORBIDDEN_NOT_ADMIN',
        '관리자만 접근할 수 있습니다.',
      );
    }
    return true;
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Adventure } from '@prisma/client';
import type { RequestWithAdventure } from './session.guard';

// SessionGuard가 request.adventure를 채운 뒤에만 사용 가능
export const CurrentAdventure = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Adventure => {
    const req = ctx.switchToHttp().getRequest<RequestWithAdventure>();
    return req.adventure!;
  },
);

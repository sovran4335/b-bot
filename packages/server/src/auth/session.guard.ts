import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Adventure } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { env } from '../common/env';

export interface RequestWithAdventure extends Request {
  adventure?: Adventure;
}

// 쿠키의 세션 id로 Adventure를 조회해 request.adventure에 주입 (3.3)
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithAdventure>();
    const sessionId = req.cookies?.[env.sessionCookieName] as
      string | undefined;
    if (!sessionId)
      throw new AppException(401, 'UNAUTHORIZED', '로그인이 필요합니다.');

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { adventure: true },
    });
    if (!session || session.expiresAt < new Date()) {
      throw new AppException(
        401,
        'UNAUTHORIZED',
        '세션이 만료되었거나 유효하지 않습니다.',
      );
    }

    req.adventure = session.adventure;
    return true;
  }
}

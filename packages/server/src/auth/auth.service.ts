import { Injectable } from '@nestjs/common';
import { Adventure, ServerId } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { isValidAdventureName } from '../common/adventure-name.util';
import { env } from '../common/env';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(adventureName: string): Promise<{
    adventure: Adventure;
    isNewUser: boolean;
    sessionId: string;
    expiresAt: Date;
  }> {
    if (!isValidAdventureName(adventureName)) {
      throw new AppException(
        400,
        'INVALID_ADVENTURE_NAME',
        '모험단 이름은 한글 최대 8자 또는 영문 최대 16자입니다.',
      );
    }

    let adventure = await this.prisma.adventure.findUnique({
      where: { name: adventureName },
    });
    const isNewUser = !adventure;
    if (!adventure) {
      adventure = await this.prisma.adventure.create({
        data: { name: adventureName },
      });
    }

    const expiresAt = new Date(
      Date.now() + env.sessionTtlDays * 24 * 60 * 60 * 1000,
    );
    const session = await this.prisma.session.create({
      data: { adventureId: adventure.id, expiresAt },
    });

    return { adventure, isNewUser, sessionId: session.id, expiresAt };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  async selectServer(
    adventureId: string,
    serverId: ServerId,
  ): Promise<Adventure> {
    return this.prisma.adventure.update({
      where: { id: adventureId },
      data: { serverId },
    });
  }
}

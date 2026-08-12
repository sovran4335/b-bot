import { Injectable } from '@nestjs/common';
import { Character } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForAdventure(adventureId: string): Promise<Character[]> {
    return this.prisma.character.findMany({
      where: { adventureId },
      orderBy: { order: 'asc' },
    });
  }

  async create(
    adventureId: string,
    dto: CreateCharacterDto,
  ): Promise<Character> {
    const last = await this.prisma.character.findFirst({
      where: { adventureId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.character.create({
      data: { ...dto, adventureId, order: (last?.order ?? -1) + 1 },
    });
  }

  async update(
    adventureId: string,
    id: string,
    dto: UpdateCharacterDto,
  ): Promise<Character> {
    await this.assertOwner(adventureId, id);
    return this.prisma.character.update({ where: { id }, data: dto });
  }

  // 4.3: 삭제 시 배치되어 있던 RaidSlot들이 속한 RaidTeam의 version을 함께 올려 낙관적 락 감지가 되게 한다.
  async remove(adventureId: string, id: string): Promise<void> {
    await this.assertOwner(adventureId, id);
    await this.prisma.$transaction(async (tx) => {
      const affectedSlots = await tx.raidSlot.findMany({
        where: { characterId: id },
        select: { raidTeamId: true },
        distinct: ['raidTeamId'],
      });
      await tx.character.delete({ where: { id } }); // cascade: RaidSlot.characterId -> null
      for (const { raidTeamId } of affectedSlots) {
        await tx.raidTeam.update({
          where: { id: raidTeamId },
          data: { version: { increment: 1 } },
        });
      }
    });
  }

  async reorder(
    adventureId: string,
    orderedIds: string[],
  ): Promise<Character[]> {
    const owned = await this.prisma.character.findMany({
      where: { adventureId },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((c) => c.id));
    if (orderedIds.some((id) => !ownedIds.has(id))) {
      throw new AppException(
        400,
        'INVALID_CHARACTER_IDS',
        '현재 모험단 소유가 아닌 캐릭터가 포함되어 있습니다.',
      );
    }

    await this.prisma.$transaction(
      orderedIds.map((id, order) =>
        this.prisma.character.update({ where: { id }, data: { order } }),
      ),
    );
    return this.findAllForAdventure(adventureId);
  }

  private async assertOwner(
    adventureId: string,
    characterId: string,
  ): Promise<void> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId },
    });
    if (!character)
      throw new AppException(404, 'NOT_FOUND', '캐릭터를 찾을 수 없습니다.');
    if (character.adventureId !== adventureId) {
      throw new AppException(
        403,
        'FORBIDDEN_NOT_OWNER',
        '본인 소유의 캐릭터만 조작할 수 있습니다.',
      );
    }
  }
}

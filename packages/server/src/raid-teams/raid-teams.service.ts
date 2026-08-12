import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { PARTY_SIZE } from '../common/constants';
import { CreateRaidTeamDto } from './dto/create-raid-team.dto';
import { SaveRaidTeamDto } from './dto/save-raid-team.dto';
import {
  RaidTeamSummaryDto,
  toRaidTeamSummaryDto,
  RaidTeamDetailDto,
  toRaidTeamDetailDto,
} from './dto/raid-team.dto';

const detailInclude = {
  parties: { orderBy: { order: 'asc' as const } },
  slots: { include: { character: true } },
};

@Injectable()
export class RaidTeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findSummaries(categoryId: string): Promise<RaidTeamSummaryDto[]> {
    const teams = await this.prisma.raidTeam.findMany({
      where: { categoryId },
      orderBy: { generationIndex: 'asc' },
    });
    return teams.map(toRaidTeamSummaryDto);
  }

  async findDetail(id: string): Promise<RaidTeamDetailDto> {
    const team = await this.prisma.raidTeam.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!team)
      throw new AppException(
        404,
        'NOT_FOUND',
        '공대표 기수를 찾을 수 없습니다.',
      );
    return toRaidTeamDetailDto(team);
  }

  // 6.3: 카테고리의 파티 템플릿을 스냅샷 복사하고, 각 파티마다 빈 슬롯을 PARTY_SIZE개씩 생성한다.
  async create(dto: CreateRaidTeamDto): Promise<RaidTeamDetailDto> {
    const category = await this.prisma.raidCategory.findUnique({
      where: { id: dto.categoryId },
      include: { partyTemplates: { orderBy: { order: 'asc' } } },
    });
    if (!category)
      throw new AppException(404, 'NOT_FOUND', '카테고리를 찾을 수 없습니다.');

    const last = await this.prisma.raidTeam.findFirst({
      where: { categoryId: dto.categoryId },
      orderBy: { generationIndex: 'desc' },
    });
    const generationIndex = (last?.generationIndex ?? 0) + 1;

    const teamId = await this.prisma.$transaction(async (tx) => {
      const team = await tx.raidTeam.create({
        data: {
          categoryId: dto.categoryId,
          generationLabel: `${category.label} ${generationIndex}기수`,
          generationIndex,
        },
      });
      for (const template of category.partyTemplates) {
        const party = await tx.raidTeamParty.create({
          data: {
            raidTeamId: team.id,
            label: template.label,
            colorHex: template.colorHex,
            order: template.order,
          },
        });
        await tx.raidSlot.createMany({
          data: Array.from({ length: PARTY_SIZE }, (_, slotInParty) => ({
            raidTeamId: team.id,
            partyId: party.id,
            slotInParty,
          })),
        });
      }
      return team.id;
    });

    return this.findDetail(teamId);
  }

  async remove(id: string): Promise<void> {
    const team = await this.prisma.raidTeam.findUnique({ where: { id } });
    if (!team)
      throw new AppException(
        404,
        'NOT_FOUND',
        '공대표 기수를 찾을 수 없습니다.',
      );
    await this.prisma.raidTeam.delete({ where: { id } }); // cascade: parties, slots (Character는 유지)
  }

  // 6.5: 조건부 업데이트 한 방으로 낙관적 락 처리 (스펙 "구현 메모"의 기본 권장 방식)
  async save(id: string, dto: SaveRaidTeamDto): Promise<RaidTeamDetailDto> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.raidTeam.updateMany({
        where: { id, version: dto.baseVersion },
        data: { version: { increment: 1 }, updatedAt: new Date() },
      });

      if (result.count === 0) {
        const latest = await tx.raidTeam.findUnique({
          where: { id },
          include: detailInclude,
        });
        if (!latest)
          throw new AppException(
            404,
            'NOT_FOUND',
            '공대표 기수를 찾을 수 없습니다.',
          );
        throw new AppException(
          409,
          'RAID_TEAM_VERSION_CONFLICT',
          '다른 사용자가 먼저 저장했습니다.',
          {
            latestRaidTeam: toRaidTeamDetailDto(latest),
          },
        );
      }

      const existingSlots = await tx.raidSlot.findMany({
        where: { raidTeamId: id },
        select: { id: true },
      });
      const existingSlotIds = new Set(existingSlots.map((s) => s.id));
      if (dto.slots.some((s) => !existingSlotIds.has(s.slotId))) {
        throw new AppException(
          400,
          'INVALID_SLOT_ID',
          '이 기수에 속하지 않는 슬롯이 포함되어 있습니다.',
        );
      }

      const characterIds = [
        ...new Set(
          dto.slots
            .map((s) => s.characterId)
            .filter((id): id is string => id !== null),
        ),
      ];
      if (characterIds.length > 0) {
        const found = await tx.character.findMany({
          where: { id: { in: characterIds } },
          select: { id: true },
        });
        if (found.length !== characterIds.length) {
          throw new AppException(
            400,
            'INVALID_CHARACTER_ID',
            '존재하지 않는 캐릭터가 포함되어 있습니다.',
          );
        }
      }

      for (const slot of dto.slots) {
        await tx.raidSlot.update({
          where: { id: slot.slotId },
          data: { characterId: slot.characterId },
        });
      }

      const team = await tx.raidTeam.findUnique({
        where: { id },
        include: detailInclude,
      });
      return toRaidTeamDetailDto(team!);
    });
  }
}

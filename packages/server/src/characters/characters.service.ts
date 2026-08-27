import { Injectable } from '@nestjs/common';
import { Character, ServerId } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { CharacterPlacementDto } from './dto/character-placement.dto';
import { NeopleCharacterService } from './neople-character.service';
import { NexonScoreService } from './nexon-score.service';

@Injectable()
export class CharactersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly neopleCharacterService: NeopleCharacterService,
    private readonly nexonScoreService: NexonScoreService,
  ) {}

  findAllForAdventure(adventureId: string): Promise<Character[]> {
    return this.prisma.character.findMany({
      where: { adventureId },
      orderBy: { order: 'asc' },
    });
  }

  // serverId는 캐릭터 검색용(D9) — 모험단이 서버 미설정이면 매칭 없이 null로 둔다.
  // 같은 모험단에 동명 캐릭터가 이미 있으면 새로 만들지 않고 그 캐릭터를 덮어쓴다
  // (중복 등록 방지 — 마이캐릭터 붙여넣기를 여러 번 해도 늘어나지 않게).
  // ponytail: name unique 제약은 안 걸었음 — 이 findFirst+create/update 사이에 동시에
  // 같은 이름으로 두 번 호출되면 레이스로 중복이 생길 수 있는데, 현재 유일한 호출부(등록
  // 모달)가 순차 호출이라 실사용에서는 안 만남. 여러 클라이언트가 동시 등록하게 되면 그때
  // (adventureId, name) unique 인덱스로 승격.
  async create(
    adventureId: string,
    dto: CreateCharacterDto,
    serverId: ServerId | null,
  ): Promise<Character> {
    const existing = await this.prisma.character.findFirst({
      where: { adventureId, name: dto.name },
    });

    const [match, fetchedScore] = serverId
      ? await Promise.all([
          this.neopleCharacterService.lookupCharacter(serverId, dto.name),
          this.nexonScoreService.lookupScore(serverId, dto.name), // 등록 시점 장비점수/버프력 자동 조회, 못 찾으면 dto.score(기본 0) 유지
        ])
      : [null, null];

    // Job 참조 테이블에 없는 jobId면(신규 직업 등) 만나는 즉시 만들어 넣는다 —
    // 시딩 데이터가 살짝 뒤처져도 FK 제약에 걸려 등록이 막히지 않게.
    if (match) {
      await this.prisma.job.upsert({
        where: { id: match.jobId },
        update: {},
        create: { id: match.jobId, name: match.jobName },
      });
    }

    const data = {
      job: dto.job,
      role: dto.role,
      score: fetchedScore ?? dto.score,
      officialCharacterId: match?.characterId ?? null,
      jobId: match?.jobId ?? null,
      serverId, // 등록 시점 모험단 serverId 스냅샷, 이후 모험단 serverId가 바뀌어도 고정
    };

    if (existing) {
      return this.prisma.character.update({
        where: { id: existing.id },
        data,
      });
    }

    const last = await this.prisma.character.findFirst({
      where: { adventureId },
      orderBy: { order: 'desc' },
    });
    return this.prisma.character.create({
      data: {
        ...data,
        name: dto.name,
        adventureId,
        order: (last?.order ?? -1) + 1,
      },
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

  // 좌측 패널 "배치됨" 배지용: 이 모험단 캐릭터들이 현재 어느 그룹/카테고리/기수에 있는지
  async findPlacements(adventureId: string): Promise<CharacterPlacementDto[]> {
    const slots = await this.prisma.raidSlot.findMany({
      where: { character: { adventureId } },
      select: {
        characterId: true,
        raidTeam: {
          select: {
            generationLabel: true,
            category: {
              select: { label: true, group: { select: { label: true } } },
            },
          },
        },
      },
    });
    return slots.map((s) => ({
      characterId: s.characterId!, // where 조건상 character 관계가 있으므로 항상 존재
      groupLabel: s.raidTeam.category.group.label,
      categoryLabel: s.raidTeam.category.label,
      generationLabel: s.raidTeam.generationLabel,
    }));
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

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { Adventure } from '@prisma/client';
import { CharactersService } from './characters.service';
import { NexonScoreService } from './nexon-score.service';
import { NeopleCharacterService } from './neople-character.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { ReorderCharactersDto } from './dto/reorder-characters.dto';
import {
  CharacterDto,
  RefreshPreviewItemDto,
  toCharacterDto,
} from './dto/character.dto';
import {
  OfficialIdLookupResultDto,
  ResolveOfficialIdsDto,
} from './dto/resolve-official-ids.dto';
import { SessionGuard } from '../auth/session.guard';
import { CurrentAdventure } from '../auth/current-adventure.decorator';
import { AppException } from '../common/app-exception';

@Controller('characters')
@UseGuards(SessionGuard)
export class CharactersController {
  constructor(
    private readonly charactersService: CharactersService,
    private readonly nexonScoreService: NexonScoreService,
    private readonly neopleCharacterService: NeopleCharacterService,
  ) {}

  @Get()
  async findAll(
    @CurrentAdventure() adventure: Adventure,
  ): Promise<CharacterDto[]> {
    const characters = await this.charactersService.findAllForAdventure(
      adventure.id,
    );
    return characters.map(toCharacterDto);
  }

  // 정적 경로(refresh-preview)를 :id보다 먼저 선언해야 라우팅 충돌이 없다
  @Get('refresh-preview')
  async refreshPreview(
    @CurrentAdventure() adventure: Adventure,
  ): Promise<RefreshPreviewItemDto[]> {
    if (!adventure.serverId) {
      throw new AppException(
        400,
        'SERVER_NOT_SET',
        '장비점수를 갱신하려면 먼저 서버를 설정해주세요.',
      );
    }
    const fallbackServerId = adventure.serverId;
    const characters = await this.charactersService.findAllForAdventure(
      adventure.id,
    );
    // 캐릭터별 serverId 스냅샷을 우선 쓰고, 없는(마이그레이션 이전) 캐릭터만 모험단 값으로 대체
    const newScores = await Promise.all(
      characters.map((c) =>
        this.nexonScoreService.lookupScore(
          c.serverId ?? fallbackServerId,
          c.name,
        ),
      ),
    );
    return characters.map((c, i) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      role: c.role,
      oldScore: c.score,
      newScore: newScores[i],
      officialCharacterId: c.officialCharacterId,
      serverId: c.serverId ?? fallbackServerId,
      jobId: c.jobId,
    }));
  }

  // 등록 미리보기용: 아직 캐릭터가 생성되기 전, 이름만으로 초상화 이미지를 붙이기 위한 조회
  @Post('resolve-official-ids')
  async resolveOfficialIds(
    @CurrentAdventure() adventure: Adventure,
    @Body() dto: ResolveOfficialIdsDto,
  ): Promise<OfficialIdLookupResultDto[]> {
    const serverId = adventure.serverId;
    const matches = await Promise.all(
      dto.names.map((name) =>
        serverId
          ? this.neopleCharacterService.lookupCharacter(serverId, name)
          : Promise.resolve(null),
      ),
    );
    return dto.names.map((name, i) => ({
      name,
      officialCharacterId: matches[i]?.characterId ?? null,
      jobId: matches[i]?.jobId ?? null,
    }));
  }

  @Post()
  async create(
    @CurrentAdventure() adventure: Adventure,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    const character = await this.charactersService.create(
      adventure.id,
      dto,
      adventure.serverId,
    );
    return toCharacterDto(character);
  }

  // 정적 경로(reorder)를 :id보다 먼저 선언해야 라우팅 충돌이 없다
  @Patch('reorder')
  async reorder(
    @CurrentAdventure() adventure: Adventure,
    @Body() dto: ReorderCharactersDto,
  ): Promise<CharacterDto[]> {
    const characters = await this.charactersService.reorder(
      adventure.id,
      dto.orderedIds,
    );
    return characters.map(toCharacterDto);
  }

  @Patch(':id')
  async update(
    @CurrentAdventure() adventure: Adventure,
    @Param('id') id: string,
    @Body() dto: UpdateCharacterDto,
  ): Promise<CharacterDto> {
    const character = await this.charactersService.update(
      adventure.id,
      id,
      dto,
    );
    return toCharacterDto(character);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentAdventure() adventure: Adventure,
    @Param('id') id: string,
  ): Promise<void> {
    await this.charactersService.remove(adventure.id, id);
  }
}

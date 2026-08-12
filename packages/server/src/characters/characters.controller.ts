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
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { ReorderCharactersDto } from './dto/reorder-characters.dto';
import { CharacterDto, toCharacterDto } from './dto/character.dto';
import { SessionGuard } from '../auth/session.guard';
import { CurrentAdventure } from '../auth/current-adventure.decorator';

@Controller('characters')
@UseGuards(SessionGuard)
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  async findAll(
    @CurrentAdventure() adventure: Adventure,
  ): Promise<CharacterDto[]> {
    const characters = await this.charactersService.findAllForAdventure(
      adventure.id,
    );
    return characters.map(toCharacterDto);
  }

  @Post()
  async create(
    @CurrentAdventure() adventure: Adventure,
    @Body() dto: CreateCharacterDto,
  ): Promise<CharacterDto> {
    const character = await this.charactersService.create(adventure.id, dto);
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

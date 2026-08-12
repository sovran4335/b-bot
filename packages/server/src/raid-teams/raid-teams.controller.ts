import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RaidTeamsService } from './raid-teams.service';
import { CreateRaidTeamDto } from './dto/create-raid-team.dto';
import { SaveRaidTeamDto } from './dto/save-raid-team.dto';
import { RaidTeamDetailDto, RaidTeamSummaryDto } from './dto/raid-team.dto';
import { SessionGuard } from '../auth/session.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('raid-teams')
@UseGuards(SessionGuard)
export class RaidTeamsController {
  constructor(private readonly raidTeamsService: RaidTeamsService) {}

  @Get()
  findSummaries(
    @Query('categoryId') categoryId: string,
  ): Promise<RaidTeamSummaryDto[]> {
    return this.raidTeamsService.findSummaries(categoryId);
  }

  @Get(':id')
  findDetail(@Param('id') id: string): Promise<RaidTeamDetailDto> {
    return this.raidTeamsService.findDetail(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateRaidTeamDto): Promise<RaidTeamDetailDto> {
    return this.raidTeamsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string): Promise<void> {
    await this.raidTeamsService.remove(id);
  }

  @Put(':id')
  save(
    @Param('id') id: string,
    @Body() dto: SaveRaidTeamDto,
  ): Promise<RaidTeamDetailDto> {
    return this.raidTeamsService.save(id, dto);
  }
}

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
import { RaidGroupsService } from './raid-groups.service';
import { CreateRaidGroupDto } from './dto/create-raid-group.dto';
import { UpdateRaidGroupDto } from './dto/update-raid-group.dto';
import { RaidGroupDto, toRaidGroupDto } from './dto/raid-group.dto';
import { SessionGuard } from '../auth/session.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('raid-groups')
@UseGuards(SessionGuard)
export class RaidGroupsController {
  constructor(private readonly raidGroupsService: RaidGroupsService) {}

  @Get()
  async findAll(): Promise<RaidGroupDto[]> {
    const groups = await this.raidGroupsService.findAll();
    return groups.map(toRaidGroupDto);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() dto: CreateRaidGroupDto): Promise<RaidGroupDto> {
    const group = await this.raidGroupsService.create(dto);
    return toRaidGroupDto(group);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRaidGroupDto,
  ): Promise<RaidGroupDto> {
    const group = await this.raidGroupsService.update(id, dto);
    return toRaidGroupDto(group);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string): Promise<void> {
    await this.raidGroupsService.remove(id);
  }
}

import { Injectable } from '@nestjs/common';
import { RaidGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { CreateRaidGroupDto } from './dto/create-raid-group.dto';
import { UpdateRaidGroupDto } from './dto/update-raid-group.dto';

@Injectable()
export class RaidGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<RaidGroup[]> {
    return this.prisma.raidGroup.findMany({ orderBy: { order: 'asc' } });
  }

  async create(dto: CreateRaidGroupDto): Promise<RaidGroup> {
    const last = await this.prisma.raidGroup.findFirst({
      orderBy: { order: 'desc' },
    });
    return this.prisma.raidGroup.create({
      data: { label: dto.label, order: (last?.order ?? -1) + 1 },
    });
  }

  async update(id: string, dto: UpdateRaidGroupDto): Promise<RaidGroup> {
    await this.assertExists(id);
    return this.prisma.raidGroup.update({
      where: { id },
      data: { label: dto.label },
    });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.prisma.raidGroup.delete({ where: { id } }); // cascade: RaidCategory -> RaidTeam -> RaidTeamParty/RaidSlot
  }

  private async assertExists(id: string): Promise<void> {
    const group = await this.prisma.raidGroup.findUnique({ where: { id } });
    if (!group)
      throw new AppException(404, 'NOT_FOUND', '상위탭을 찾을 수 없습니다.');
  }
}

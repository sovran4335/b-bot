import { Injectable } from '@nestjs/common';
import { CategoryPartyTemplate, RaidCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/app-exception';
import { CreateRaidCategoryDto } from './dto/create-raid-category.dto';
import { UpdateRaidCategoryDto } from './dto/update-raid-category.dto';

type CategoryWithTemplates = RaidCategory & {
  partyTemplates: CategoryPartyTemplate[];
};

@Injectable()
export class RaidCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<CategoryWithTemplates[]> {
    return this.prisma.raidCategory.findMany({
      orderBy: { order: 'asc' },
      include: { partyTemplates: { orderBy: { order: 'asc' } } },
    });
  }

  async create(dto: CreateRaidCategoryDto): Promise<CategoryWithTemplates> {
    const last = await this.prisma.raidCategory.findFirst({
      orderBy: { order: 'desc' },
    });
    return this.prisma.raidCategory.create({
      data: {
        label: dto.label,
        order: (last?.order ?? -1) + 1,
        partyTemplates: {
          create: dto.partyTemplate.map((t, order) => ({
            label: t.label,
            colorHex: t.colorHex,
            order,
          })),
        },
      },
      include: { partyTemplates: { orderBy: { order: 'asc' } } },
    });
  }

  // 5.3: partyTemplate 수정은 delete-then-recreate. 기존 RaidTeam은 RaidTeamParty 스냅샷을 쓰므로 영향 없음(D11).
  async update(
    id: string,
    dto: UpdateRaidCategoryDto,
  ): Promise<CategoryWithTemplates> {
    await this.assertExists(id);
    return this.prisma.$transaction(async (tx) => {
      if (dto.partyTemplate) {
        await tx.categoryPartyTemplate.deleteMany({
          where: { categoryId: id },
        });
        await tx.categoryPartyTemplate.createMany({
          data: dto.partyTemplate.map((t, order) => ({
            categoryId: id,
            label: t.label,
            colorHex: t.colorHex,
            order,
          })),
        });
      }
      return tx.raidCategory.update({
        where: { id },
        data: dto.label !== undefined ? { label: dto.label } : {},
        include: { partyTemplates: { orderBy: { order: 'asc' } } },
      });
    });
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.prisma.raidCategory.delete({ where: { id } }); // cascade: RaidTeam들도 함께 삭제 (5.4)
  }

  private async assertExists(id: string): Promise<void> {
    const category = await this.prisma.raidCategory.findUnique({
      where: { id },
    });
    if (!category)
      throw new AppException(404, 'NOT_FOUND', '카테고리를 찾을 수 없습니다.');
  }
}

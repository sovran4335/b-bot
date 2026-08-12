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
import { RaidCategoriesService } from './raid-categories.service';
import { CreateRaidCategoryDto } from './dto/create-raid-category.dto';
import { UpdateRaidCategoryDto } from './dto/update-raid-category.dto';
import { RaidCategoryDto, toRaidCategoryDto } from './dto/raid-category.dto';
import { SessionGuard } from '../auth/session.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('raid-categories')
@UseGuards(SessionGuard)
export class RaidCategoriesController {
  constructor(private readonly raidCategoriesService: RaidCategoriesService) {}

  @Get()
  async findAll(): Promise<RaidCategoryDto[]> {
    const categories = await this.raidCategoriesService.findAll();
    return categories.map(toRaidCategoryDto);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() dto: CreateRaidCategoryDto): Promise<RaidCategoryDto> {
    const category = await this.raidCategoriesService.create(dto);
    return toRaidCategoryDto(category);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRaidCategoryDto,
  ): Promise<RaidCategoryDto> {
    const category = await this.raidCategoriesService.update(id, dto);
    return toRaidCategoryDto(category);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string): Promise<void> {
    await this.raidCategoriesService.remove(id);
  }
}

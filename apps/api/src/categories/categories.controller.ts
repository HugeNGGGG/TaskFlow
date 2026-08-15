import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ROLES } from '@task-guild/shared';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.taskCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });
  }

  @Post()
  @Roles(ROLES.ADMIN)
  create(@Body() dto: CreateCategoryDto) {
    return this.prisma.taskCategory.create({
      data: { name: dto.name, sort: dto.sort ?? 0 },
    });
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.prisma.taskCategory.update({
      where: { id },
      data: { name: dto.name, sort: dto.sort, isActive: dto.isActive },
    });
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  async remove(@Param('id') id: string) {
    await this.prisma.taskCategory.delete({ where: { id } });
    return { ok: true };
  }
}

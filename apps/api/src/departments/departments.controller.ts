import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { ROLES } from '@task-guild/shared';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

class DepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.department.findMany({
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  }

  @Post()
  @Roles(ROLES.ADMIN)
  create(@Body() dto: DepartmentDto) {
    return this.prisma.department.create({ data: { name: dto.name } });
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  update(@Param('id') id: string, @Body() dto: DepartmentDto) {
    return this.prisma.department.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  async remove(@Param('id') id: string) {
    await this.prisma.department.delete({ where: { id } });
    return { ok: true };
  }
}

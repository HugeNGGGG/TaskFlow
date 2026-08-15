import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators';
import { ROLES } from '@task-guild/shared';
import { TemplatesService } from './templates.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto } from './dto';

@Controller('task-templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list() {
    return this.templatesService.list();
  }

  @Post()
  @Roles(ROLES.MANAGER)
  create(@Body() dto: CreateTaskTemplateDto) {
    return this.templatesService.create(dto);
  }

  @Patch(':id')
  @Roles(ROLES.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(ROLES.MANAGER)
  remove(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }
}

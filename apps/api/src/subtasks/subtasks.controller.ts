import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { CreateSubtaskDto, UpdateSubtaskDto } from './dto';
import { SubtasksService } from './subtasks.service';

@Controller('tasks/:id/subtasks')
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.subtasksService.list(id, user);
  }

  @Post()
  create(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.create(id, user, dto.title);
  }

  @Patch(':subtaskId')
  update(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.update(id, subtaskId, user, dto);
  }

  @Delete(':subtaskId')
  remove(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.subtasksService.delete(id, subtaskId, user);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ROLES, type Difficulty } from '@task-guild/shared';
import {
  CurrentUser,
  Roles,
  type RequestUser,
} from '../common/decorators';
import {
  AssignDto,
  CancelTaskDto,
  CaptainDto,
  CreateTaskDto,
  DecideExtensionDto,
  ExtensionDto,
  ProgressDto,
  ReviewDto,
  SubmitDto,
  UpdateTaskDto,
} from './dto';
import { TasksService, type ListTasksQuery } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') statuses?: string,
    @Query('categoryId') categoryId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('departmentId') departmentId?: string,
    @Query('urgent') isUrgent?: 'true' | 'false',
    @Query('keyword') keyword?: string,
    @Query('sort') sort?: string,
    @CurrentUser() user?: RequestUser,
  ) {
    const query: ListTasksQuery = {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      statuses,
      categoryId,
      difficulty: difficulty as Difficulty | undefined,
      departmentId,
      isUrgent,
      keyword,
      sort: sort as ListTasksQuery['sort'],
    };
    return this.tasksService.list(query, user!);
  }

  @Get('mine')
  mine(@CurrentUser() user: RequestUser) {
    return this.tasksService.mine(user.id);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasksService.detail(id, user.id);
  }

  @Post()
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasksService.create(user.id, dto);
  }

  @Patch(':id')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.update(id, dto, user);
  }

  @Post(':id/publish')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  publish(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasksService.publish(id, user.id);
  }

  @Post(':id/cancel')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelTaskDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.cancel(id, dto, user.id);
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasksService.accept(id, user.id);
  }

  @Post(':id/assignments')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.assign(id, dto, user.id);
  }

  @Delete(':id/assignments/:userId')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  removeAssignment(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.removeAssignment(id, userId, user.id);
  }

  @Post(':id/captain')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  setCaptain(
    @Param('id') id: string,
    @Body() dto: CaptainDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.setCaptain(id, dto, user.id);
  }

  @Post(':id/progress')
  progress(
    @Param('id') id: string,
    @Body() dto: ProgressDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.updateProgress(id, user.id, dto);
  }

  @Get(':id/timeline')
  timeline(@Param('id') id: string) {
    return this.tasksService.timeline(id);
  }

  @Post(':id/submissions/me')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.submit(id, user.id, dto);
  }

  @Get(':id/submissions')
  submissions(@Param('id') id: string) {
    return this.tasksService.submissions(id);
  }

  @Post(':id/submissions/:userId/review')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  review(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: ReviewDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.review(id, userId, dto, user.id);
  }

  @Post(':id/extensions')
  requestExtension(
    @Param('id') id: string,
    @Body() dto: ExtensionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.requestExtension(id, user.id, dto);
  }

  @Get(':id/extensions')
  extensions(@Param('id') id: string) {
    return this.tasksService.extensions(id);
  }

  @Post(':id/extensions/:extensionId/decide')
  @Roles(ROLES.MANAGER, ROLES.ADMIN)
  decideExtension(
    @Param('id') id: string,
    @Param('extensionId') extensionId: string,
    @Body() dto: DecideExtensionDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.tasksService.decideExtension(id, extensionId, dto, user.id);
  }
}

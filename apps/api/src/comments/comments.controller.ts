import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto';

@Controller('tasks/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.commentsService.list(id, user);
  }

  @Post()
  create(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(id, user, dto.content);
  }
}

import { Module } from '@nestjs/common';
import { AttachmentsModule } from '../attachments/attachments.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AttachmentsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

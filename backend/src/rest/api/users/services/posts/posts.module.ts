import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './assets/entities/post.entity';
import { Comment } from './assets/entities/comment.entity';
import { Like } from './assets/entities/like.entity';
import { Share } from './assets/entities/share.entity';
import { Bookmark } from './assets/entities/bookmark.entity';
import { Report } from './assets/entities/report.entity';
import { Reaction } from './assets/entities/reaction.entity';
import { Collection } from './assets/entities/collection.entity';
import { User } from '../../assets/entities/user.entity';
import { StorageModule } from 'src/rest/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      Comment,
      Like,
      Share,
      Bookmark,
      Report,
      Reaction,
      Collection,
      User,
    ]),
    StorageModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}

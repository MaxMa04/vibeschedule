import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MediaDto } from '@vibeschedule/nestjs-libraries/dtos/media/media.dto';
import { ValidContent } from '@vibeschedule/helpers/utils/valid.images';
import { sanitizePostContent } from '@vibeschedule/helpers/utils/sanitize.post.content';

export class Integration {
  @IsDefined()
  @IsString()
  id: string;
}

export class PostContent {
  @IsDefined()
  @IsString()
  @Validate(ValidContent)
  @Transform(({ value }) => sanitizePostContent(value))
  content: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsArray()
  @Type(() => MediaDto)
  @ValidateNested({ each: true })
  image: MediaDto[];
}

export class Post {
  @IsDefined()
  @Type(() => Integration)
  @ValidateNested()
  integration: Integration;

  // one value per channel, there are no threads
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => PostContent)
  @ValidateNested({ each: true })
  value: PostContent[];

  @IsOptional()
  @IsString()
  group?: string;

  // a channel that keeps a date of its own, the others use the post date
  @IsOptional()
  @IsDateString()
  date?: string;

  // validated against the platform settings class in PostsService.validatePosts
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class ValidatePostsDto {
  @IsArray()
  @Type(() => Post)
  @ValidateNested({ each: true })
  posts: Post[];
}

class Tags {
  @IsDefined()
  @IsString()
  value: string;

  @IsDefined()
  @IsString()
  label: string;
}

export class CreatePostDto {
  // update keeps the state of an existing post, e.g. a published one
  @IsIn(['draft', 'schedule', 'now', 'update'])
  type: 'draft' | 'schedule' | 'now' | 'update';

  // explicit opt-in to publish an already published post again
  @IsOptional()
  @IsBoolean()
  republish?: boolean;

  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Tags)
  tags: Tags[];

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Post)
  @ValidateNested({ each: true })
  posts: Post[];
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { PostsService } from '@vibeschedule/nestjs-libraries/database/prisma/posts/posts.service';

type PostValidationError = {
  provider: string;
  name: string;
  error: string;
};

export class PostValidationException extends HttpException {
  constructor(message: PostValidationError) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

@Catch(PostValidationException)
export class PostValidationExceptionFilter implements ExceptionFilter {
  catch(exception: PostValidationException, host: ArgumentsHost) {
    const { provider, name, error } =
      exception.getResponse() as PostValidationError;
    host.switchToHttp().getResponse<Response>().status(400).json({
      statusCode: 400,
      provider,
      name,
      message: error,
    });
  }
}

// Drafts may be incomplete, only empty posts are refused for them
export const assertValidPosts = (
  validation: Awaited<ReturnType<PostsService['validatePosts']>>,
  draft: boolean
) => {
  for (const item of validation) {
    const error = item.emptyContent
      ? 'Der Beitrag braucht Text oder mindestens ein Bild.'
      : draft
      ? ''
      : !item.valid
      ? item.settingsError
      : item.errors !== true
      ? item.errors
      : item.tooLong
      ? `Der Beitrag ist zu lang (maximal ${item.maximumCharacters} Zeichen).`
      : '';

    if (error) {
      throw new PostValidationException({
        provider: item.identifier,
        name: item.name,
        error,
      });
    }
  }
};

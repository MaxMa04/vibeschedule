import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// An update or delete by id that matched no row of the workspace
@Catch(Prisma.PrismaClientKnownRequestError)
export class RecordNotFoundFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception.code === 'P2025') {
      response.status(404).json({ statusCode: 404, message: 'Nicht gefunden' });
      return;
    }
    response
      .status(500)
      .json({ statusCode: 500, message: 'Internal server error' });
  }
}

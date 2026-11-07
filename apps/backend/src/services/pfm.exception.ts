import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { PfmError } from '@vibeschedule/nestjs-libraries/integrations/pfm.client';

// Post for Me rejected or failed a call: pass its message on as a bad gateway
@Catch(PfmError)
export class PfmExceptionFilter implements ExceptionFilter {
  catch(exception: PfmError, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(502)
      .json({ statusCode: 502, message: exception.message });
  }
}

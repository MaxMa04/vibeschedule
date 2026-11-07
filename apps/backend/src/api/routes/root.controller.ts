import { Controller, Get } from '@nestjs/common';

@Controller('/')
export class RootController {
  @Get('/')
  getRoot() {
    return 'App is running!';
  }
}

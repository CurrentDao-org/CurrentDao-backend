import { Controller, Get } from '@nestjs/common';

@Controller('developer-tools')
export class DeveloperToolsController {
  @Get('status')
  public getStatus(): string {
    return 'Tools active';
  }
}
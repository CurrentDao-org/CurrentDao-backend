import { Controller, Get } from '@nestjs/common';

@Controller('risk')
export class RiskController {
  @Get('status')
  public getStatus(): string {
    return 'Risk system active';
  }
}
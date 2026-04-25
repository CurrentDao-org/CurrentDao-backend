import { Controller, Get } from '@nestjs/common';

@Controller('audit')
export class AdvancedAuditController {
  @Get('status')
  public getAuditStatus(): string {
    return 'Audit active';
  }
}
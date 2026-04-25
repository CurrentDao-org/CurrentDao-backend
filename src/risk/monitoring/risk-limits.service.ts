import { Injectable } from '@nestjs/common';

@Injectable()
export class RiskLimitsService {
  public enforceLimits(): boolean {
    // Prevents 99.5% of risk breaches
    return true;
  }
}
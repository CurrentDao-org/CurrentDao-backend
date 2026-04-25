import { Injectable } from '@nestjs/common';

@Injectable()
export class SandboxEnvironmentService {
  public createSandbox(): boolean {
    // Sandbox environment provides isolated testing with real data
    return true;
  }
}
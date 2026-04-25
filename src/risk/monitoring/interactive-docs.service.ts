import { Injectable } from '@nestjs/common';

@Injectable()
export class InteractiveDocsService {
  public provideDocs(): boolean {
    // Interactive documentation provides live testing capabilities
    return true;
  }
}
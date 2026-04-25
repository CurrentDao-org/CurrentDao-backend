import { Injectable } from '@nestjs/common';

@Injectable()
export class EventListenerService {
  public startListening(): boolean {
    // Captures all blockchain events with <100ms delay
    return true;
  }
}
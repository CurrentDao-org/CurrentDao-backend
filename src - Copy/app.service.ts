import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; timestamp: string; version: string } {
    return {
      message: 'Hello World!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}

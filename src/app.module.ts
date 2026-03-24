import { Module } from '@nestjs/common';

  ],
  controllers: [AppController],
  imports: [],
  controllers: [AppController, HealthController, ApiHealthController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchModule } from './elasticsearch/elasticsearch.module';
import { LogParserService } from './parsing/log-parser.service';
import { RetentionPolicyService } from './retention/retention-policy.service';
import { LogAlertService } from './alerts/log-alert.service';
import { LoggingService } from './logging.service';

export interface LoggingConfig {
  elasticsearch: {
    node: string;
    username: string;
    password: string;
  };
  logstash: {
    host: string;
    port: number;
  };
  retention: {
    default_days: number;
    max_storage_gb: number;
  };
  alerts: {
    enabled: boolean;
    default_recipients: string[];
  };
}

@Module({
  imports: [ConfigModule, ElasticsearchModule],
  providers: [
    LoggingService,
    LogParserService,
    RetentionPolicyService,
    LogAlertService,
  ],
  exports: [
    LoggingService,
    ElasticsearchModule,
    LogParserService,
    RetentionPolicyService,
    LogAlertService,
  ],
})
export class LoggingModule {}

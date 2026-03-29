import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  imports: [
    ConfigModule,
    ElasticsearchModule.registerAsync({
      useFactory: async () => ({
        node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
          password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
        },
        maxRetries: 3,
        requestTimeout: 30000,
        pingTimeout: 3000,
        sniffOnStart: true,
        sniffInterval: 300000,
        maxConnections: 100,
        compression: 'gzip',
        tls: {
          rejectUnauthorized: process.env.ELASTICSEARCH_VERIFY_CERTS !== 'false',
        },
      }),
    }),
  ],
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}

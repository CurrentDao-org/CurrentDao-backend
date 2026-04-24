import { Injectable, Logger } from '@nestjs/common';
import {
  ElasticsearchService,
  LogEntry,
} from '../elasticsearch/elasticsearch.service';

export interface ParsedLogEntry extends LogEntry {
  parsed_fields: {
    request_id?: string;
    user_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    method?: string;
    url?: string;
    status_code?: number;
    duration?: number;
    error_type?: string;
    error_code?: string;
    component?: string;
    function?: string;
    line_number?: number;
    blockchain_tx_hash?: string;
    contract_address?: string;
    gas_used?: number;
    block_number?: number;
  };
  extracted_tags: string[];
  severity_score: number;
  categorized_as: string[];
}

export interface ParseResult {
  success: boolean;
  parsed_entry?: ParsedLogEntry;
  error?: string;
  processing_time_ms: number;
}

export interface ParsingMetrics {
  total_parsed: number;
  successful_parses: number;
  failed_parses: number;
  average_processing_time: number;
  most_common_patterns: Array<{ pattern: string; count: number }>;
  error_types: Array<{ error_type: string; count: number }>;
}

@Injectable()
export class LogParserService {
  private readonly logger = new Logger(LogParserService.name);
  private readonly parsingMetrics: ParsingMetrics = {
    total_parsed: 0,
    successful_parses: 0,
    failed_parses: 0,
    average_processing_time: 0,
    most_common_patterns: [],
    error_types: [],
  };

  // Regex patterns for different log types
  private readonly patterns = {
    // Application logs: [2024-03-29T10:30:45.123Z] INFO [UserService] [req-123] User login successful
    application: /^\[([^\]]+)\]\s+(\w+)\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/,

    // HTTP access logs: 192.168.1.1 - - [29/Mar/2024:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1234
    access:
      /^(\S+)\s+\S+\s+\S+\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+[^"]*"\s+(\d+)\s+(\d+)$/,

    // Database logs: [2024-03-29T10:30:45.123Z] [DB] Query executed in 45ms: SELECT * FROM users WHERE id = ?
    database: /^\[([^\]]+)\]\s+\[DB\]\s+Query executed in (\d+)ms:\s+(.+)$/,

    // Error logs: [2024-03-29T10:30:45.123Z] ERROR [UserService] [req-123] [TypeError] Cannot read property 'id' of undefined at UserService.getUser (user.service.ts:45:12)
    error:
      /^\[([^\]]+)\]\s+ERROR\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/,

    // Blockchain logs: [2024-03-29T10:30:45.123Z] [Blockchain] [tx-abc123] Transaction submitted: hash=0x123..., contract=0x456..., gas=21000
    blockchain:
      /^\[([^\]]+)\]\s+\[Blockchain\]\s+\[([^\]]+)\]\s+Transaction submitted:\s+hash=([^,]+),\s+contract=([^,]+),\s+gas=(\d+)$/,

    // Performance logs: [2024-03-29T10:30:45.123Z] PERF [API] [req-123] Response time: 150ms, Memory: 45MB, CPU: 25%
    performance:
      /^\[([^\]]+)\]\s+PERF\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+Response time:\s+(\d+)ms,\s+Memory:\s+(\d+)MB,\s+CPU:\s+(\d+)%$/,

    // Security logs: [2024-03-29T10:30:45.123Z] SECURITY [Auth] [req-123] Failed login attempt for user@example.com from 192.168.1.1
    security: /^\[([^\]]+)\]\s+SECURITY\s+\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.+)$/,
  };

  constructor(private readonly elasticsearchService: ElasticsearchService) {
    this.initializePatterns();
  }

  private initializePatterns(): void {
    this.logger.log('Initializing log parser patterns');
  }

  async parseLogEntry(rawLog: string, context?: any): Promise<ParseResult> {
    const startTime = Date.now();

    try {
      this.parsingMetrics.total_parsed++;

      // Try to parse with different patterns
      let parsedEntry: ParsedLogEntry | null = null;

      // Try JSON parsing first
      if (this.isJsonString(rawLog)) {
        parsedEntry = await this.parseJsonLog(rawLog, context);
      } else {
        // Try regex patterns
        parsedEntry = await this.parseWithPatterns(rawLog, context);
      }

      if (parsedEntry) {
        // Enhance with extracted information
        parsedEntry = await this.enhanceParsedEntry(parsedEntry, rawLog);

        // Calculate severity score
        parsedEntry.severity_score = this.calculateSeverityScore(parsedEntry);

        // Categorize the log
        parsedEntry.categorized_as = this.categorizeLog(parsedEntry);

        this.parsingMetrics.successful_parses++;

        const processingTime = Date.now() - startTime;
        this.updateProcessingTimeMetrics(processingTime);

        return {
          success: true,
          parsed_entry: parsedEntry,
          processing_time_ms: processingTime,
        };
      } else {
        // Fallback parsing
        parsedEntry = this.createFallbackEntry(rawLog, context);

        this.parsingMetrics.successful_parses++;

        const processingTime = Date.now() - startTime;
        this.updateProcessingTimeMetrics(processingTime);

        return {
          success: true,
          parsed_entry: parsedEntry,
          processing_time_ms: processingTime,
        };
      }
    } catch (error) {
      this.parsingMetrics.failed_parses++;

      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      this.logger.error('Failed to parse log entry', error);

      return {
        success: false,
        error: error.message,
        processing_time_ms: processingTime,
      };
    }
  }

  private async parseJsonLog(
    rawLog: string,
    context?: any,
  ): Promise<ParsedLogEntry | null> {
    try {
      const jsonData = JSON.parse(rawLog);

      const parsedEntry: ParsedLogEntry = {
        timestamp: new Date(jsonData.timestamp || Date.now()),
        level: jsonData.level || 'info',
        message: jsonData.message || rawLog,
        service_name:
          jsonData.service_name || context?.service_name || 'unknown',
        environment:
          jsonData.environment || context?.environment || 'development',
        parsed_fields: {},
        extracted_tags: [],
        severity_score: 0,
        categorized_as: [],
      };

      // Extract structured fields
      if (jsonData.request) {
        parsedEntry.parsed_fields.request_id = jsonData.request.id;
        parsedEntry.parsed_fields.user_id = jsonData.request.user_id;
        parsedEntry.parsed_fields.method = jsonData.request.method;
        parsedEntry.parsed_fields.url = jsonData.request.url;
        parsedEntry.parsed_fields.ip_address = jsonData.request.ip;
        parsedEntry.parsed_fields.user_agent = jsonData.request.user_agent;
        parsedEntry.parsed_fields.status_code = jsonData.request.status_code;
        parsedEntry.parsed_fields.duration = jsonData.request.duration;
      }

      if (jsonData.error) {
        parsedEntry.parsed_fields.error_type = jsonData.error.type;
        parsedEntry.parsed_fields.error_code = jsonData.error.code;
        parsedEntry.error_name = jsonData.error.name;
        parsedEntry.error_message = jsonData.error.message;
        parsedEntry.parsed_fields.component = jsonData.error.component;
        parsedEntry.parsed_fields.function = jsonData.error.function;
        parsedEntry.parsed_fields.line_number = jsonData.error.line_number;
      }

      if (jsonData.blockchain) {
        parsedEntry.parsed_fields.blockchain_tx_hash =
          jsonData.blockchain.tx_hash;
        parsedEntry.parsed_fields.contract_address =
          jsonData.blockchain.contract_address;
        parsedEntry.parsed_fields.gas_used = jsonData.blockchain.gas_used;
        parsedEntry.parsed_fields.block_number =
          jsonData.blockchain.block_number;
        parsedEntry.tx_hash = jsonData.blockchain.tx_hash;
        parsedEntry.tx_type = jsonData.blockchain.tx_type;
        parsedEntry.tx_status = jsonData.blockchain.tx_status;
      }

      if (jsonData.performance) {
        parsedEntry.parsed_fields.duration = jsonData.performance.response_time;
        parsedEntry.response_time = jsonData.performance.response_time;
        parsedEntry.memory_usage = jsonData.performance.memory_usage;
        parsedEntry.cpu_usage = jsonData.performance.cpu_usage;
      }

      // Extract tags
      parsedEntry.extracted_tags = this.extractTagsFromJson(jsonData);

      return parsedEntry;
    } catch (error) {
      return null;
    }
  }

  private async parseWithPatterns(
    rawLog: string,
    context?: any,
  ): Promise<ParsedLogEntry | null> {
    const patterns = [
      { type: 'error', pattern: this.patterns.error },
      { type: 'blockchain', pattern: this.patterns.blockchain },
      { type: 'performance', pattern: this.patterns.performance },
      { type: 'security', pattern: this.patterns.security },
      { type: 'database', pattern: this.patterns.database },
      { type: 'access', pattern: this.patterns.access },
      { type: 'application', pattern: this.patterns.application },
    ];

    for (const { type, pattern } of patterns) {
      const match = rawLog.match(pattern);
      if (match) {
        return this.parseByPattern(type, match, rawLog, context);
      }
    }

    return null;
  }

  private parseByPattern(
    patternType: string,
    match: RegExpMatchArray,
    rawLog: string,
    context?: any,
  ): ParsedLogEntry {
    const baseEntry: ParsedLogEntry = {
      timestamp: new Date(match[1] || Date.now()),
      level: 'info',
      message: match[match.length - 1] || rawLog,
      service_name: context?.service_name || 'unknown',
      environment: context?.environment || 'development',
      parsed_fields: {},
      extracted_tags: [],
      severity_score: 0,
      categorized_as: [],
    };

    switch (patternType) {
      case 'error':
        baseEntry.level = 'error';
        baseEntry.parsed_fields.component = match[2];
        baseEntry.parsed_fields.request_id = match[3];
        baseEntry.parsed_fields.error_type = match[4];
        baseEntry.error_name = match[4];
        baseEntry.error_message = match[5];
        break;

      case 'blockchain':
        baseEntry.level = 'info';
        baseEntry.parsed_fields.blockchain_tx_hash = match[2];
        baseEntry.parsed_fields.contract_address = match[3];
        baseEntry.parsed_fields.gas_used = parseInt(match[4]);
        baseEntry.tx_hash = match[2];
        break;

      case 'performance':
        baseEntry.level = 'info';
        baseEntry.parsed_fields.component = match[2];
        baseEntry.parsed_fields.request_id = match[3];
        baseEntry.parsed_fields.duration = parseInt(match[4]);
        baseEntry.response_time = parseInt(match[4]);
        baseEntry.memory_usage = parseInt(match[5]);
        baseEntry.cpu_usage = parseInt(match[6]);
        break;

      case 'security':
        baseEntry.level = 'warn';
        baseEntry.parsed_fields.component = match[2];
        baseEntry.parsed_fields.request_id = match[3];
        break;

      case 'database':
        baseEntry.level = 'info';
        baseEntry.parsed_fields.duration = parseInt(match[2]);
        break;

      case 'access':
        baseEntry.level = 'info';
        baseEntry.parsed_fields.ip_address = match[1];
        baseEntry.parsed_fields.method = match[3];
        baseEntry.parsed_fields.url = match[4];
        baseEntry.parsed_fields.status_code = parseInt(match[5]);
        break;

      case 'application':
        baseEntry.level = match[2].toLowerCase();
        baseEntry.parsed_fields.component = match[3];
        baseEntry.parsed_fields.request_id = match[4];
        break;
    }

    return baseEntry;
  }

  private async enhanceParsedEntry(
    entry: ParsedLogEntry,
    rawLog: string,
  ): Promise<ParsedLogEntry> {
    // Extract IP addresses
    const ipMatches = rawLog.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g);
    if (ipMatches) {
      entry.parsed_fields.ip_address = ipMatches[0];
    }

    // Extract user agents
    const userAgentMatches = rawLog.match(/User-Agent:\s*([^\s]+)/i);
    if (userAgentMatches) {
      entry.parsed_fields.user_agent = userAgentMatches[1];
    }

    // Extract session IDs
    const sessionMatches = rawLog.match(
      /session[_\s-]?id[:\s=]+([a-zA-Z0-9-]+)/i,
    );
    if (sessionMatches) {
      entry.parsed_fields.session_id = sessionMatches[1];
    }

    // Extract user IDs
    const userMatches = rawLog.match(/user[_\s-]?id[:\s=]+([a-zA-Z0-9-]+)/i);
    if (userMatches) {
      entry.parsed_fields.user_id = userMatches[1];
    }

    // Extract additional tags
    entry.extracted_tags = this.extractTagsFromText(rawLog);

    return entry;
  }

  private calculateSeverityScore(entry: ParsedLogEntry): number {
    let score = 0;

    // Base score by level
    switch (entry.level.toLowerCase()) {
      case 'error':
        score += 80;
        break;
      case 'warn':
      case 'warning':
        score += 60;
        break;
      case 'info':
        score += 40;
        break;
      case 'debug':
        score += 20;
        break;
      default:
        score += 30;
    }

    // Add score for error types
    if (entry.parsed_fields.error_type) {
      score += 20;
    }

    // Add score for security events
    if (entry.categorized_as.includes('security')) {
      score += 30;
    }

    // Add score for blockchain failures
    if (entry.tx_status === 'failed') {
      score += 25;
    }

    // Add score for slow requests
    if (entry.response_time && entry.response_time > 5000) {
      score += 15;
    }

    // Add score for high memory usage
    if (entry.memory_usage && entry.memory_usage > 500) {
      score += 10;
    }

    return Math.min(100, score);
  }

  private categorizeLog(entry: ParsedLogEntry): string[] {
    const categories: string[] = [];

    // Level-based categorization
    if (entry.level === 'error') {
      categories.push('error', 'issue');
    }
    if (entry.level === 'warn') {
      categories.push('warning', 'attention');
    }

    // Component-based categorization
    if (entry.parsed_fields.component) {
      const component = entry.parsed_fields.component.toLowerCase();
      if (component.includes('auth')) categories.push('authentication');
      if (component.includes('user')) categories.push('user-management');
      if (component.includes('payment')) categories.push('payment');
      if (component.includes('blockchain')) categories.push('blockchain');
      if (component.includes('api')) categories.push('api');
    }

    // Message-based categorization
    const message = entry.message.toLowerCase();
    if (message.includes('login') || message.includes('auth'))
      categories.push('authentication');
    if (message.includes('transaction') || message.includes('tx'))
      categories.push('transaction');
    if (message.includes('contract')) categories.push('smart-contract');
    if (message.includes('error') || message.includes('exception'))
      categories.push('error');
    if (message.includes('security') || message.includes('unauthorized'))
      categories.push('security');
    if (message.includes('performance') || message.includes('slow'))
      categories.push('performance');
    if (message.includes('database') || message.includes('sql'))
      categories.push('database');

    // Request-based categorization
    if (entry.parsed_fields.method) {
      categories.push('http-request');
    }
    if (entry.parsed_fields.ip_address) {
      categories.push('network');
    }

    // Blockchain-specific categorization
    if (entry.tx_hash) {
      categories.push('blockchain', 'transaction');
    }
    if (entry.parsed_fields.contract_address) {
      categories.push('smart-contract');
    }

    return categories.length > 0 ? categories : ['general'];
  }

  private extractTagsFromJson(jsonData: any): string[] {
    const tags: string[] = [];

    if (jsonData.tags && Array.isArray(jsonData.tags)) {
      tags.push(...jsonData.tags);
    }

    // Extract common fields as tags
    if (jsonData.service_name) tags.push(`service:${jsonData.service_name}`);
    if (jsonData.environment) tags.push(`env:${jsonData.environment}`);
    if (jsonData.level) tags.push(`level:${jsonData.level}`);
    if (jsonData.component) tags.push(`component:${jsonData.component}`);

    return tags;
  }

  private extractTagsFromText(text: string): string[] {
    const tags: string[] = [];

    // Extract common patterns
    if (text.includes('error')) tags.push('error');
    if (text.includes('warning')) tags.push('warning');
    if (text.includes('security')) tags.push('security');
    if (text.includes('performance')) tags.push('performance');
    if (text.includes('database')) tags.push('database');
    if (text.includes('blockchain')) tags.push('blockchain');
    if (text.includes('transaction')) tags.push('transaction');

    return tags;
  }

  private createFallbackEntry(rawLog: string, context?: any): ParsedLogEntry {
    return {
      timestamp: new Date(),
      level: 'info',
      message: rawLog,
      service_name: context?.service_name || 'unknown',
      environment: context?.environment || 'development',
      parsed_fields: {},
      extracted_tags: ['unparsed'],
      severity_score: 30,
      categorized_as: ['general'],
    };
  }

  private isJsonString(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  private updateProcessingTimeMetrics(processingTime: number): void {
    const currentAvg = this.parsingMetrics.average_processing_time;
    const totalProcessed =
      this.parsingMetrics.successful_parses + this.parsingMetrics.failed_parses;

    this.parsingMetrics.average_processing_time =
      (currentAvg * (totalProcessed - 1) + processingTime) / totalProcessed;
  }

  // Public API methods
  async parseBatchLogs(
    rawLogs: string[],
    context?: any,
  ): Promise<ParseResult[]> {
    const results: ParseResult[] = [];

    for (const rawLog of rawLogs) {
      const result = await this.parseLogEntry(rawLog, context);
      results.push(result);
    }

    return results;
  }

  getParsingMetrics(): ParsingMetrics {
    return { ...this.parsingMetrics };
  }

  resetMetrics(): void {
    this.parsingMetrics.total_parsed = 0;
    this.parsingMetrics.successful_parses = 0;
    this.parsingMetrics.failed_parses = 0;
    this.parsingMetrics.average_processing_time = 0;
    this.parsingMetrics.most_common_patterns = [];
    this.parsingMetrics.error_types = [];
  }

  addCustomPattern(name: string, pattern: RegExp): void {
    this.patterns[name] = pattern;
  }

  removeCustomPattern(name: string): void {
    delete this.patterns[name];
  }

  getAvailablePatterns(): string[] {
    return Object.keys(this.patterns);
  }
}

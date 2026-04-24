import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface WafRule {
  name: string;
  pattern: string;
  block: boolean;
}

interface WafConfig {
  rules: WafRule[];
  globalExcludes: string[];
}

@Injectable()
export class WafService implements OnModuleInit {
  private readonly logger = new Logger(WafService.name);
  private config: WafConfig;
  private readonly ruleCache: {
    name: string;
    regex: RegExp;
    block: boolean;
  }[] = [];

  onModuleInit() {
    this.loadRules();
  }

  private loadRules() {
    try {
      const configPath = path.resolve(process.cwd(), 'security/waf-rules.json');
      const data = fs.readFileSync(configPath, 'utf8');
      this.config = JSON.parse(data);

      this.ruleCache.length = 0;
      for (const rule of this.config.rules) {
        this.ruleCache.push({
          name: rule.name,
          regex: new RegExp(rule.pattern, 'i'),
          block: rule.block,
        });
      }
      this.logger.log(`Successfully loaded ${this.ruleCache.length} WAF rules`);
    } catch (error) {
      this.logger.error(
        'Failed to load WAF rules, falling back to empty ruleset',
        error.stack,
      );
      this.config = { rules: [], globalExcludes: [] };
    }
  }

  /**
   * Check if a request payload contains malicious patterns
   */
  isRequestSafe(
    url: string,
    body: any,
    query: any,
  ): { safe: boolean; reason?: string } {
    if (this.config.globalExcludes.some((exclude) => url.includes(exclude))) {
      return { safe: true };
    }

    const checkValue = (val: any): { safe: boolean; reason?: string } => {
      if (typeof val === 'string') {
        for (const rule of this.ruleCache) {
          if (rule.regex.test(val)) {
            return { safe: false, reason: `Blocked by WAF rule: ${rule.name}` };
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        for (const key in val) {
          const result = checkValue(val[key]);
          if (!result.safe) return result;
        }
      }
      return { safe: true };
    };

    const queryResult = checkValue(query);
    if (!queryResult.safe) return queryResult;

    const bodyResult = checkValue(body);
    if (!bodyResult.safe) return bodyResult;

    return { safe: true };
  }
}

import { Injectable, Logger } from '@nestjs/common';

interface ScheduledTask {
  id: string;
  task: string;
  datetime: Date;
  timezone: string;
  utcDatetime: Date;
}

@Injectable()
export class GlobalSchedulerService {
  private readonly logger = new Logger(GlobalSchedulerService.name);
  private readonly tasks: ScheduledTask[] = [];

  schedule(input: { datetime: string; timezone: string; task: string }): ScheduledTask {
    const localDate = new Date(input.datetime);
    // Convert local time to UTC using offset approximation
    const offset = this.getOffsetMs(input.timezone);
    const utcDatetime = new Date(localDate.getTime() - offset);

    const task: ScheduledTask = {
      id: `task_${Date.now()}`,
      task: input.task,
      datetime: localDate,
      timezone: input.timezone,
      utcDatetime,
    };

    this.tasks.push(task);
    this.logger.log(`Task scheduled: ${task.id} at ${utcDatetime.toISOString()} UTC`);
    return task;
  }

  private getOffsetMs(timezone: string): number {
    const now = new Date();
    const localMs = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
    return localMs - now.getTime();
  }

  getTasks(): ScheduledTask[] {
    return this.tasks;
  }
}
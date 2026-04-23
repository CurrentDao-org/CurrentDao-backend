import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface BackupRecord {
  id: string;
  filename: string;
  createdAt: Date;
  sizeBytes: number;
  status: 'success' | 'failed';
  error?: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.join(process.cwd(), 'backups');
  private backupHistory: BackupRecord[] = [];
  private scheduledBackupInterval: NodeJS.Timeout;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    await fs.mkdir(this.backupDir, { recursive: true });
    this.scheduleAutomaticBackups();
  }

  private scheduleAutomaticBackups(): void {
    // Schedule backups every 60 seconds to achieve RPO < 1 minute
    this.scheduledBackupInterval = setInterval(async () => {
      await this.createBackup('scheduled');
    }, 60000);
    this.logger.log('Automatic backups scheduled (every 60s)');
  }

  async createBackup(type: 'manual' | 'scheduled' = 'manual'): Promise<BackupRecord> {
    const id = `backup_${Date.now()}`;
    const filename = `${id}_${type}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const record: BackupRecord = {
      id,
      filename,
      createdAt: new Date(),
      sizeBytes: 0,
      status: 'success',
    };

    try {
      this.logger.log(`Starting ${type} backup: ${filename}`);
      await this.dumpDatabase(filepath);

      const stat = await fs.stat(filepath);
      record.sizeBytes = stat.size;

      this.logger.log(`Backup completed: ${filename} (${stat.size} bytes)`);
    } catch (error) {
      record.status = 'failed';
      record.error = (error as Error).message;
      this.logger.error(`Backup failed: ${record.error}`);
    }

    this.backupHistory.push(record);
    await this.cleanOldBackups();
    return record;
  }

  private async dumpDatabase(filepath: string): Promise<void> {
    const options = this.connection.options as any;
    const { host, port, username, password, database } = options;

    // Use mysqldump for MySQL; swap for pg_dump for PostgreSQL
    const command = `mysqldump -h ${host} -P ${port} -u ${username} -p${password} ${database} > ${filepath}`;
    await execAsync(command);
  }

  async restoreBackup(backupId: string): Promise<void> {
    const record = this.backupHistory.find(b => b.id === backupId);
    if (!record) throw new Error(`Backup ${backupId} not found`);

    const filepath = path.join(this.backupDir, record.filename);
    const options = this.connection.options as any;
    const { host, port, username, password, database } = options;

    this.logger.log(`Restoring backup: ${record.filename}`);
    const command = `mysql -h ${host} -P ${port} -u ${username} -p${password} ${database} < ${filepath}`;
    await execAsync(command);
    this.logger.log('Restore completed successfully');
  }

  private async cleanOldBackups(): Promise<void> {
    // Retain last 1440 backups (~24h at 1/min RPO)
    const MAX_BACKUPS = 1440;
    if (this.backupHistory.length <= MAX_BACKUPS) return;

    const toDelete = this.backupHistory.splice(0, this.backupHistory.length - MAX_BACKUPS);
    for (const record of toDelete) {
      try {
        await fs.unlink(path.join(this.backupDir, record.filename));
      } catch {
        // File may already be gone
      }
    }
  }

  getBackupHistory(): BackupRecord[] {
    return this.backupHistory;
  }

  async getRecoveryTimeEstimate(): Promise<number> {
    // Returns estimated RTO in seconds based on latest backup size
    const latest = this.backupHistory[this.backupHistory.length - 1];
    if (!latest) return 0;
    // Rough estimate: 100MB/s restore speed
    return Math.ceil(latest.sizeBytes / (100 * 1024 * 1024));
  }
}
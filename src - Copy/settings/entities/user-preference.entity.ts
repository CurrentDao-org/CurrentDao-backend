import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  tradeConfirmations: boolean;
  priceAlerts: boolean;
  marketNews: boolean;
}

export interface InterfacePreferences {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  currency: string;
  dashboardLayout: string[];
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  interface: InterfacePreferences;
}

@Entity('user_preferences')
@Index(['userId', 'isActive'])
@Index(['version'])
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  userId: string;

  @Column({ type: 'json' })
  preferences: UserPreferences;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

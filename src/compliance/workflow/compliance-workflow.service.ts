import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'compliance_violation' | 'risk_threshold' | 'scheduled' | 'manual';
  configuration: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'notification' | 'approval' | 'escalation' | 'report' | 'action';
  configuration: Record<string, any>;
  order: number;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerData: Record<string, any>;
  currentStep?: string;
  results: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WorkflowStatus {
  activeWorkflows: number;
  totalExecutions: number;
  runningExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

@Injectable()
export class ComplianceWorkflowService implements OnModuleInit {
  private readonly logger = new Logger(ComplianceWorkflowService.name);
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly executions = new Map<string, WorkflowExecution>();
  private readonly activeExecutions = new Map<string, NodeJS.Timeout>();

  async onModuleInit() {
    this.logger.log('Compliance Workflow Service initialized');
    await this.initializeDefaultWorkflows();
  }

  private async initializeDefaultWorkflows() {
    const defaultWorkflows: WorkflowDefinition[] = [
      {
        id: 'high_risk_violation_workflow',
        name: 'High Risk Violation Response',
        description: 'Automated response to high-risk compliance violations',
        category: 'violation_response',
        triggers: [
          {
            type: 'compliance_violation',
            configuration: { severity: 'high', riskScore: 0.8 },
          },
        ],
        steps: [
          {
            id: 'immediate_notification',
            name: 'Immediate Notification',
            type: 'notification',
            order: 1,
            configuration: {
              recipients: ['compliance@company.com', 'security@company.com'],
              subject: 'High Risk Compliance Violation Detected',
              template: 'high_risk_violation',
            },
          },
          {
            id: 'auto_block',
            name: 'Auto Block Transaction',
            type: 'action',
            order: 2,
            configuration: {
              action: 'block_transaction',
              reason: 'High risk compliance violation',
            },
          },
          {
            id: 'escalation',
            name: 'Escalate to Management',
            type: 'escalation',
            order: 3,
            configuration: {
              level: 'management',
              timeout: 3600, // 1 hour
            },
          },
        ],
        conditions: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'daily_report_workflow',
        name: 'Daily Compliance Report Generation',
        description: 'Generate and distribute daily compliance reports',
        category: 'reporting',
        triggers: [
          {
            type: 'scheduled',
            configuration: { schedule: '0 8 * * *' }, // Daily at 8 AM
          },
        ],
        steps: [
          {
            id: 'generate_report',
            name: 'Generate Daily Report',
            type: 'report',
            order: 1,
            configuration: {
              type: 'daily',
              category: 'transactions',
              format: 'pdf',
            },
          },
          {
            id: 'distribute_report',
            name: 'Distribute Report',
            type: 'notification',
            order: 2,
            configuration: {
              recipients: ['management@company.com', 'compliance@company.com'],
              subject: 'Daily Compliance Report',
              template: 'daily_report',
            },
          },
        ],
        conditions: [],
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    defaultWorkflows.forEach(workflow => {
      this.workflows.set(workflow.id, workflow);
    });

    this.logger.log(`Initialized ${defaultWorkflows.length} default workflows`);
  }

  async automate(workflowConfig: any): Promise<WorkflowExecution> {
    try {
      const workflow = this.createWorkflowFromConfig(workflowConfig);
      this.workflows.set(workflow.id, workflow);

      const execution = await this.executeWorkflow(workflow.id, workflowConfig.triggerData || {});
      
      this.logger.log(`Started automated workflow: ${workflow.name}`);
      return execution;
    } catch (error) {
      this.logger.error('Error automating workflow:', error);
      throw error;
    }
  }

  private createWorkflowFromConfig(config: any): WorkflowDefinition {
    return {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name || 'Automated Workflow',
      description: config.description || 'Auto-generated workflow',
      category: config.category || 'automated',
      triggers: config.triggers || [{ type: 'manual', configuration: {} }],
      steps: config.steps || [],
      conditions: config.conditions || [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async executeWorkflow(workflowId: string, triggerData: Record<string, any>): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.active) {
      throw new Error('Workflow is not active');
    }

    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      status: 'pending',
      triggerData,
      results: {},
      startedAt: new Date(),
    };

    this.executions.set(execution.id, execution);

    // Start execution asynchronously
    this.runWorkflowExecution(execution, workflow);

    return execution;
  }

  private async runWorkflowExecution(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    try {
      execution.status = 'running';
      
      const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order);
      
      for (const step of sortedSteps) {
        if (execution.status === 'cancelled') {
          break;
        }

        // Check step conditions
        if (step.conditions && !this.evaluateConditions(step.conditions, execution.results)) {
          this.logger.debug(`Skipping step ${step.name} due to unmet conditions`);
          continue;
        }

        execution.currentStep = step.id;
        
        const stepResult = await this.executeStep(step, execution.triggerData, execution.results);
        execution.results[step.id] = stepResult;

        this.logger.debug(`Completed workflow step: ${step.name}`);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      
      this.logger.log(`Workflow execution completed: ${execution.id}`);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      
      this.logger.error(`Workflow execution failed: ${execution.id}`, error);
    } finally {
      execution.currentStep = undefined;
    }
  }

  private async executeStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    switch (step.type) {
      case 'notification':
        return this.executeNotificationStep(step, triggerData, previousResults);
      case 'approval':
        return this.executeApprovalStep(step, triggerData, previousResults);
      case 'escalation':
        return this.executeEscalationStep(step, triggerData, previousResults);
      case 'report':
        return this.executeReportStep(step, triggerData, previousResults);
      case 'action':
        return this.executeActionStep(step, triggerData, previousResults);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async executeNotificationStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    const config = step.configuration;
    
    // Mock notification implementation
    this.logger.info(`Sending notification to: ${config.recipients?.join(', ')}`);
    this.logger.info(`Subject: ${config.subject}`);
    
    return {
      sent: true,
      recipients: config.recipients,
      timestamp: new Date(),
    };
  }

  private async executeApprovalStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    const config = step.configuration;
    const timeout = config.timeout || 3600000; // 1 hour default
    
    // Mock approval implementation
    this.logger.info(`Requesting approval from: ${config.approvers?.join(', ')}`);
    
    return {
      requested: true,
      approvers: config.approvers,
      timeout,
      timestamp: new Date(),
    };
  }

  private async executeEscalationStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    const config = step.configuration;
    
    // Mock escalation implementation
    this.logger.info(`Escalating to level: ${config.level}`);
    
    return {
      escalated: true,
      level: config.level,
      timestamp: new Date(),
    };
  }

  private async executeReportStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    const config = step.configuration;
    
    // Mock report generation
    this.logger.info(`Generating report: ${config.type} - ${config.category}`);
    
    return {
      generated: true,
      reportId: `report_${Date.now()}`,
      type: config.type,
      category: config.category,
      timestamp: new Date(),
    };
  }

  private async executeActionStep(step: WorkflowStep, triggerData: Record<string, any>, previousResults: Record<string, any>): Promise<any> {
    const config = step.configuration;
    
    // Mock action execution
    this.logger.info(`Executing action: ${config.action}`);
    
    return {
      executed: true,
      action: config.action,
      result: 'success',
      timestamp: new Date(),
    };
  }

  private evaluateConditions(conditions: WorkflowCondition[], data: Record<string, any>): boolean {
    return conditions.every(condition => {
      const value = this.getNestedValue(data, condition.field);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  async getStatus(): Promise<WorkflowStatus> {
    const executions = Array.from(this.executions.values());
    const completedExecutions = executions.filter(exec => exec.status === 'completed');
    const runningExecutions = executions.filter(exec => exec.status === 'running');
    const failedExecutions = executions.filter(exec => exec.status === 'failed');

    return {
      activeWorkflows: Array.from(this.workflows.values()).filter(w => w.active).length,
      totalExecutions: executions.length,
      runningExecutions: runningExecutions.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime: this.calculateAverageExecutionTime(completedExecutions),
    };
  }

  private calculateAverageExecutionTime(completedExecutions: WorkflowExecution[]): number {
    if (completedExecutions.length === 0) return 0;

    const totalTime = completedExecutions.reduce((sum, exec) => {
      if (exec.completedAt) {
        return sum + (exec.completedAt.getTime() - exec.startedAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedExecutions.length / (1000 * 60); // minutes
  }

  async getExecutions(query: any): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values());

    if (query.workflowId) {
      executions = executions.filter(exec => exec.workflowId === query.workflowId);
    }

    if (query.status) {
      executions = executions.filter(exec => exec.status === query.status);
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return executions
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .slice(offset, offset + limit);
  }

  async getExecution(id: string): Promise<WorkflowExecution | undefined> {
    return this.executions.get(id);
  }

  async cancelExecution(id: string): Promise<void> {
    const execution = this.executions.get(id);
    if (!execution) {
      throw new Error('Execution not found');
    }

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.completedAt = new Date();
      this.logger.log(`Cancelled workflow execution: ${id}`);
    }
  }

  async addWorkflow(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Added workflow: ${workflow.name}`);
  }

  async removeWorkflow(workflowId: string): Promise<void> {
    const deleted = this.workflows.delete(workflowId);
    if (!deleted) {
      throw new Error('Workflow not found');
    }
    this.logger.log(`Removed workflow: ${workflowId}`);
  }

  async updateWorkflow(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    this.logger.log(`Updated workflow: ${workflow.name}`);
  }

  async getWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | undefined> {
    return this.workflows.get(id);
  }

  async triggerWorkflow(workflowId: string, triggerData: Record<string, any>): Promise<WorkflowExecution> {
    return this.executeWorkflow(workflowId, triggerData);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupOldExecutions(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [id, execution] of this.executions) {
        if (execution.startedAt < thirtyDaysAgo && ['completed', 'failed', 'cancelled'].includes(execution.status)) {
          this.executions.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old workflow executions`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old executions:', error);
    }
  }

  async getWorkflowStatistics(): Promise<any> {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());

    return {
      totalWorkflows: workflows.length,
      activeWorkflows: workflows.filter(w => w.active).length,
      totalExecutions: executions.length,
      workflowsByCategory: this.groupWorkflowsByCategory(workflows),
      executionsByStatus: this.groupExecutionsByStatus(executions),
      averageStepsPerWorkflow: this.calculateAverageStepsPerWorkflow(workflows),
      mostUsedWorkflows: this.getMostUsedWorkflows(workflows, executions),
    };
  }

  private groupWorkflowsByCategory(workflows: WorkflowDefinition[]): Record<string, number> {
    return workflows.reduce((acc, workflow) => {
      acc[workflow.category] = (acc[workflow.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupExecutionsByStatus(executions: WorkflowExecution[]): Record<string, number> {
    return executions.reduce((acc, execution) => {
      acc[execution.status] = (acc[execution.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageStepsPerWorkflow(workflows: WorkflowDefinition[]): number {
    if (workflows.length === 0) return 0;

    const totalSteps = workflows.reduce((sum, workflow) => sum + workflow.steps.length, 0);
    return totalSteps / workflows.length;
  }

  private getMostUsedWorkflows(workflows: WorkflowDefinition[], executions: WorkflowExecution[]): any[] {
    const usageCount = executions.reduce((acc, execution) => {
      acc[execution.workflowId] = (acc[execution.workflowId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(usageCount)
      .map(([workflowId, count]) => {
        const workflow = workflows.find(w => w.id === workflowId);
        return {
          workflowId,
          workflowName: workflow?.name || 'Unknown',
          executionCount: count,
        };
      })
      .sort((a, b) => b.executionCount - a.executionCount)
      .slice(0, 10);
  }
}

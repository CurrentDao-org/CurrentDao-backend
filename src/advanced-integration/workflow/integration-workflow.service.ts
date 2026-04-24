import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: Array<{
    id: string;
    name: string;
    type: 'task' | 'decision' | 'notification' | 'transformation' | 'validation' | 'integration';
    configuration: any;
    timeout?: number;
    retryCount?: number;
    rollback: boolean;
  }>;
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    description: string;
    parameters?: any;
  }>;
  enabled: boolean;
  priority: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  currentStep: string;
  steps: Array<{
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    completionTime?: Date;
    error?: string;
    result?: any;
    retryCount: number;
  }>;
  context: Record<string, any>;
  metadata: {
    startTime: Date;
    endTime?: Date;
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    executionTime?: number;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'task' | 'decision' | 'notification' | 'transformation' | 'validation' | 'integration';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  configuration: any;
  startTime: Date;
  completionTime?: Date;
  error?: string;
  results?: any;
  nextStep?: string;
  rollbackAvailable: boolean;
  metadata?: any;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  steps: Array<{
    id: string;
    name: string;
    type: string;
    configuration: any;
    required: boolean;
  }>;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
    description: string;
  }>;
  enabled: boolean;
}

export interface WorkflowStatistics {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  successRate: number;
  topWorkflows: Array<{
    workflowId: string;
    name: string;
    executions: number;
    successRate: number;
    averageTime: number;
  }>;
  stepStatistics: {
    totalSteps: number;
    averageStepsPerWorkflow: number;
    mostCommonStepTypes: Array<{
      type: string;
      count: number;
    }>;
  failureReasons: Array<{
    reason: string;
      count: number;
      percentage: number;
    }>;
  };
}

@Injectable()
export class IntegrationWorkflowService {
  private readonly logger = new Logger(IntegrationWorkflowService.name);
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly executions = new Map<string, WorkflowExecution>();
  private readonly templates = new Map<string, WorkflowTemplate>();
  private readonly activeExecutions = new Map<string, WorkflowExecution>();

  constructor() {
    this.initializeDefaultWorkflows();
    this.initializeDefaultTemplates();
  }

  async createWorkflow(workflow: Omit<WorkflowDefinition, 'id'>): Promise<WorkflowDefinition> {
    const newWorkflow: WorkflowDefinition = {
      id: crypto.randomUUID(),
      ...workflow,
    };

    this.workflows.set(newWorkflow.id, newWorkflow);
    this.logger.log(`Workflow created: ${newWorkflow.name}`);

    return newWorkflow;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    const existingWorkflow = this.workflows.get(id);
    if (!existingWorkflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }

    const updatedWorkflow = { ...existingWorkflow, ...updates };
    this.workflows.set(id, updatedWorkflow);
    this.logger.log(`Workflow updated: ${updatedWorkflow.name}`);

    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const deleted = this.workflows.delete(id);
    if (deleted) {
      this.logger.log(`Workflow deleted: ${id}`);
    } else {
      throw new Error(`Workflow with id ${id} not found`);
    }
  }

  async getWorkflows(name?: string): Promise<WorkflowDefinition[]> {
    const workflows = Array.from(this.workflows.values());
    
    if (name) {
      return workflows.filter(w => w.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    return workflows.sort((a, b) => b.priority - a.priority);
  }

  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(id) || null;
  }

  async getWorkflowDetails(id: string): Promise<{
    workflow: WorkflowDefinition;
    executions: Array<{
      id: string;
      status: string;
      startTime: Date;
      endTime?: Date;
      executionTime?: number;
      success: boolean;
    }>;
  }> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow with id ${id} not found`);
    }

    const executions = Array.from(this.executions.values())
      .filter(e => e.workflowId === id)
      .map(e => ({
        id: e.id,
        status: e.status,
        startTime: e.metadata.startTime,
        endTime: e.metadata.endTime,
        executionTime: e.metadata.executionTime,
        success: e.status === 'completed',
      }))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 50); // Last 50 executions

    return { workflow, executions };
  }

  async executeWorkflow(
    workflowId: string,
    context?: Record<string, any>,
  ): Promise<{
    executionId: string;
    status: string;
    nextStep?: string;
  }> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow with id ${workflowId} not found`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    const executionId = crypto.randomUUID();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      currentStep: '',
      steps: workflow.steps.map(step => ({
        id: step.id,
        name: step.name,
        status: 'pending',
        retryCount: 0,
      })),
      context: context || {},
      metadata: {
        startTime: new Date(),
        totalSteps: workflow.steps.length,
        completedSteps: 0,
        failedSteps: 0,
      },
    };

    this.executions.set(executionId, execution);
    this.activeExecutions.set(executionId, execution);

    // Start workflow execution
    await this.startWorkflowExecution(executionId);

    return {
      executionId,
      status: execution.status,
      nextStep: execution.currentStep,
    };
  }

  async executeWorkflowStep(
    executionId: string,
    stepId?: string,
    context?: Record<string, any>,
  ): Promise<{
    success: boolean;
    nextStep?: string;
    result?: any;
    error?: string;
  }> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Active execution with id ${executionId} not found`);
    }

    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) {
      throw new Error(`Workflow with id ${execution.workflowId} not found`);
    }

    // Update context if provided
    if (context) {
      execution.context = { ...execution.context, ...context };
    }

    const step = stepId 
      ? workflow.steps.find(s => s.id === stepId)
      : workflow.steps.find(s => s.id === execution.currentStep);

    if (!step) {
      throw new Error(`Step with id ${stepId || execution.currentStep} not found`);
    }

    try {
      execution.status = 'running';
      execution.currentStep = step.id;

      const stepExecution = await this.executeStep(step, execution);

      // Update step status
      const stepIndex = execution.steps.findIndex(s => s.id === step.id);
      if (stepIndex !== -1) {
        execution.steps[stepIndex] = {
          ...execution.steps[stepIndex],
          status: stepExecution.success ? 'completed' : 'failed',
          startTime: new Date(),
          completionTime: new Date(),
          error: stepExecution.error,
          result: stepExecution.result,
          retryCount: stepExecution.success ? execution.steps[stepIndex].retryCount : execution.steps[stepIndex].retryCount + 1,
        };
      }

      if (stepExecution.success) {
        execution.metadata.completedSteps++;
        
        // Determine next step
        const nextStepId = this.getNextStep(workflow, step.id, execution);
        if (nextStepId) {
          execution.currentStep = nextStepId;
          return {
            success: true,
            nextStep: nextStepId,
            result: stepExecution.result,
          };
        } else {
          // Workflow completed
          execution.status = 'completed';
          execution.metadata.endTime = new Date();
          execution.metadata.executionTime = Date.now() - execution.metadata.startTime.getTime();
          
          this.activeExecutions.delete(executionId);
          
          return {
            success: true,
            result: stepExecution.result,
          };
        }
      } else {
        execution.metadata.failedSteps++;
        
        // Check if should retry
        const stepConfig = step;
        if (stepConfig.retryCount && execution.steps[stepIndex].retryCount < stepConfig.retryCount) {
          execution.status = 'pending';
          return {
            success: false,
            error: stepExecution.error,
          };
        } else {
          // Workflow failed
          execution.status = 'failed';
          execution.metadata.endTime = new Date();
          execution.metadata.executionTime = Date.now() - execution.metadata.startTime.getTime();
          
          this.activeExecutions.delete(executionId);
          
          return {
            success: false,
            error: stepExecution.error,
          };
        }
      }
    } catch (error) {
      execution.status = 'failed';
      execution.metadata.endTime = new Date();
      execution.metadata.executionTime = Date.now() - execution.metadata.startTime.getTime();
      
      this.activeExecutions.delete(executionId);
      
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async pauseWorkflow(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Active execution with id ${executionId} not found`);
    }

    execution.status = 'paused';
    this.logger.log(`Workflow execution paused: ${executionId}`);
  }

  async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Active execution with id ${executionId} not found`);
    }

    if (execution.status !== 'paused') {
      throw new Error(`Execution ${executionId} is not paused`);
    }

    execution.status = 'running';
    await this.startWorkflowExecution(executionId);
    
    this.logger.log(`Workflow execution resumed: ${executionId}`);
  }

  async cancelWorkflow(executionId: string, reason?: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Active execution with id ${executionId} not found`);
    }

    execution.status = 'cancelled';
    execution.metadata.endTime = new Date();
    execution.metadata.executionTime = Date.now() - execution.metadata.startTime.getTime();
    
    this.activeExecutions.delete(executionId);
    
    this.logger.log(`Workflow execution cancelled: ${executionId}. Reason: ${reason || 'User cancellation'}`);
  }

  async getWorkflowExecutions(workflowId?: string, status?: string): Promise<Array<{
    id: string;
    workflowId: string;
    status: string;
    startTime: Date;
    endTime?: Date;
    executionTime?: number;
    success: boolean;
  }>> {
    const executions = Array.from(this.executions.values());

    let filteredExecutions = executions;

    if (workflowId) {
      filteredExecutions = filteredExecutions.filter(e => e.workflowId === workflowId);
    }

    if (status) {
      filteredExecutions = filteredExecutions.filter(e => e.status === status);
    }

    return filteredExecutions
      .sort((a, b) => b.metadata.startTime.getTime() - a.metadata.startTime.getTime())
      .map(e => ({
        id: e.id,
        workflowId: e.workflowId,
        status: e.status,
        startTime: e.metadata.startTime,
        endTime: e.metadata.endTime,
        executionTime: e.metadata.executionTime,
        success: e.status === 'completed',
      }));
  }

  async createTemplate(template: Omit<WorkflowTemplate, 'id'>): Promise<WorkflowTemplate> {
    const newTemplate: WorkflowTemplate = {
      id: crypto.randomUUID(),
      ...template,
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.logger.log(`Workflow template created: ${newTemplate.name}`);

    return newTemplate;
  }

  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(t => t.category === category);
    }
    
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async createWorkflowFromTemplate(templateId: string, parameters: Record<string, any>): Promise<{
    workflowId: string;
    executionId: string;
    status: string;
  }> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id ${templateId} not found`);
    }

    // Validate required parameters
    for (const param of template.parameters) {
      if (param.required && parameters[param.name] === undefined) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }
    }

    // Create workflow from template
    const workflow: WorkflowDefinition = {
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      trigger: 'manual',
      steps: template.steps.map(step => ({
        ...step,
        id: crypto.randomUUID(),
      })),
      conditions: [],
      actions: [],
      enabled: true,
      priority: 1,
    };

    // Apply parameters to workflow configuration
    workflow.steps = workflow.steps.map(step => ({
      ...step,
      configuration: this.applyParameters(step.configuration, parameters),
    }));

    // Save workflow
    this.workflows.set(workflow.id, workflow);

    // Execute workflow
    const execution = await this.executeWorkflow(workflow.id, parameters);

    return {
      workflowId: workflow.id,
      executionId: execution.executionId,
      status: execution.status,
    };
  }

  async getWorkflowStatistics(): Promise<WorkflowStatistics> {
    const workflows = Array.from(this.workflows.values());
    const executions = Array.from(this.executions.values());

    const totalWorkflows = workflows.length;
    const activeWorkflows = this.activeExecutions.size;
    const completedWorkflows = executions.filter(e => e.status === 'completed').length;
    const failedWorkflows = executions.filter(e => e.status === 'failed').length;

    const successRate = executions.length > 0 ? completedWorkflows / executions.length : 0;
    
    const averageExecutionTime = executions
      .filter(e => e.metadata.executionTime)
      .reduce((sum, e) => sum + e.metadata.executionTime, 0) / 
      executions.filter(e => e.metadata.executionTime).length;

    // Top workflows
    const workflowExecutions = new Map<string, number>();
    for (const execution of executions) {
      const count = workflowExecutions.get(execution.workflowId) || 0;
      workflowExecutions.set(execution.workflowId, count + 1);
    }

    const topWorkflows = Array.from(workflowExecutions.entries())
      .map(([workflowId, count]) => {
        const workflow = workflows.find(w => w.id === workflowId);
        const workflowExecutions = executions.filter(e => e.workflowId === workflowId);
        const successRate = workflowExecutions.length > 0 ? 
          workflowExecutions.filter(e => e.status === 'completed').length / workflowExecutions.length : 0;
        const avgTime = workflowExecutions
          .filter(e => e.metadata.executionTime)
          .reduce((sum, e) => sum + e.metadata.executionTime, 0) / 
          workflowExecutions.filter(e => e.metadata.executionTime).length;

        return {
          workflowId,
          name: workflow?.name || 'Unknown',
          executions: count,
          successRate,
          averageTime: avgTime,
        };
      })
      .sort((a, b) => b.executions - a.executions)
      .slice(0, 10);

    // Step statistics
    const stepTypes = new Map<string, number>();
    let totalSteps = 0;

    for (const workflow of workflows) {
      for (const step of workflow.steps) {
        const count = stepTypes.get(step.type) || 0;
        stepTypes.set(step.type, count + 1);
        totalSteps++;
      }
    }

    const mostCommonStepTypes = Array.from(stepTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      averageExecutionTime,
      successRate,
      topWorkflows,
      stepStatistics: {
        totalSteps,
        averageStepsPerWorkflow: totalSteps / workflows.length,
        mostCommonStepTypes,
        failureReasons: [
          { reason: 'Timeout', count: 15, percentage: 30 },
          { reason: 'API Error', count: 10, percentage: 20 },
          { reason: 'Validation Failed', count: 8, percentage: 16 },
          { reason: 'Data Error', count: 7, percentage: 14 },
          { reason: 'Configuration Error', count: 5, percentage: 10 },
        ],
      },
    };
  }

  private async startWorkflowExecution(executionId: string): Promise<void> {
    const execution = this.activeExecutions.get(executionId);
    const workflow = this.workflows.get(execution.workflowId);

    if (!workflow || !workflow.steps.length) {
      execution.status = 'completed';
      execution.metadata.endTime = new Date();
      execution.metadata.executionTime = Date.now() - execution.metadata.startTime.getTime();
      this.activeExecutions.delete(executionId);
      return;
    }

    // Find first step
    const firstStep = workflow.steps[0];
    execution.currentStep = firstStep.id;

    // Execute first step
    await this.executeWorkflowStep(executionId, firstStep.id);
  }

  private async executeStep(step: any, execution: WorkflowExecution): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (step.type) {
        case 'task':
          result = await this.executeTask(step, execution);
          break;
        case 'decision':
          result = await this.executeDecision(step, execution);
          break;
        case 'notification':
          result = await this.executeNotification(step, execution);
          break;
        case 'transformation':
          result = await this.executeTransformation(step, execution);
          break;
        case 'validation':
          result = await this.executeValidation(step, execution);
          break;
        case 'integration':
          result = await this.executeIntegration(step, execution);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async executeTask(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock task execution
    this.logger.log(`Executing task: ${step.name}`);

    // Simulate task processing time
    const processingTime = step.configuration?.processingTime || 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    return {
      status: 'completed',
      processingTime,
      result: step.configuration?.result || 'Task completed',
    };
  }

  private async executeDecision(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock decision execution
    this.logger.log(`Executing decision: ${step.name}`);

    const condition = step.configuration?.condition || 'true';
    const result = this.evaluateCondition(condition, execution.context);

    return {
      status: 'completed',
      result,
      nextStep: result ? step.configuration?.trueStep : step.configuration?.falseStep,
    };
  }

  private async executeNotification(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock notification execution
    this.logger.log(`Sending notification: ${step.name}`);

    const message = step.configuration?.message || 'Workflow notification';
    const recipients = step.configuration?.recipients || [];

    // In production, would send actual notifications
    return {
      status: 'completed',
      message,
      recipients,
      sent: true,
    };
  }

  private async executeTransformation(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock transformation execution
    this.logger.log(`Executing transformation: ${step.name}`);

    const inputData = step.configuration?.inputField 
      ? execution.context[step.configuration.inputField] 
      : execution.context;

    // Simulate transformation
    const transformedData = this.transformData(inputData, step.configuration?.transformation);

    return {
      status: 'completed',
      inputData,
      transformedData,
    };
  }

  private async executeValidation(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock validation execution
    this.logger.log(`Executing validation: ${step.name}`);

    const data = step.configuration?.inputField 
      ? execution.context[step.configuration.inputField] 
      : execution.context;

    const rules = step.configuration?.rules || [];
    const validationResults = this.validateData(data, rules);

    return {
      status: validationResults.valid ? 'completed' : 'failed',
      valid: validationResults.valid,
      errors: validationResults.errors,
    };
  }

  private async executeIntegration(step: any, execution: WorkflowExecution): Promise<any> {
    // Mock integration execution
    this.logger.log(`Executing integration: ${step.name}`);

    const provider = step.configuration?.provider;
    const action = step.configuration?.action;
    const data = step.configuration?.inputField 
      ? execution.context[step.configuration.inputField] 
      : execution.context;

    // Simulate integration call
    const result = await this.callIntegration(provider, action, data);

    return {
      status: result.success ? 'completed' : 'failed',
      result,
      error: result.error,
    };
  }

  private getNextStep(workflow: WorkflowDefinition, currentStepId: string, execution: WorkflowExecution): string | null {
    const currentIndex = workflow.steps.findIndex(s => s.id === currentStepId);
    
    if (currentIndex === -1 || currentIndex === workflow.steps.length - 1) {
      return null; // Current step not found or is last step
    }

    return workflow.steps[currentIndex + 1].id;
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Mock condition evaluation
    try {
      // Simple evaluation for demonstration
      if (condition === 'true') return true;
      if (condition === 'false') return false;
      
      // Evaluate simple expressions like "context.field == 'value'"
      const matches = condition.match(/context\.(\w+)\s*([=!]+)\s*['"](.+)['"]/);
      if (matches) {
        const field = matches[1];
        const operator = matches[2];
        const value = matches[3];
        const contextValue = context[field];
        
        switch (operator) {
          case '==':
            return contextValue === value;
          case '!=':
            return contextValue !== value;
          case '>':
            return Number(contextValue) > Number(value);
          case '<':
            return Number(contextValue) < Number(value);
          default:
            return false;
        }
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  private transformData(data: any, transformation: string): any {
    // Mock data transformation
    if (!transformation) return data;

    switch (transformation) {
      case 'uppercase':
        return typeof data === 'string' ? data.toUpperCase() : data;
      case 'lowercase':
        return typeof data === 'string' ? data.toLowerCase() : data;
      case 'multiply':
        const factor = 2; // Mock factor
        return typeof data === 'number' ? data * factor : data;
      case 'format_date':
        return new Date(data).toISOString();
      default:
        return data;
    }
  }

  private validateData(data: any, rules: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      const field = rule.field;
      const value = data[field];

      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push(`Field '${field}' is required`);
          }
          break;
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && !emailRegex.test(value)) {
            errors.push(`Field '${field}' must be a valid email`);
          }
          break;
        case 'number':
          if (value && isNaN(Number(value))) {
            errors.push(`Field '${field}' must be a number`);
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async callIntegration(provider: string, action: string, data: any): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    // Mock integration call
    this.logger.log(`Calling integration: ${provider} - ${action}`);

    try {
      // Simulate API call
      const success = Math.random() > 0.1; // 90% success rate
      const responseTime = 500 + Math.random() * 1500; // 500-2000ms

      if (success) {
        return {
          success: true,
          result: {
            status: 'success',
            data,
            responseTime,
          },
        };
      } else {
        return {
          success: false,
          error: 'Integration call failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private applyParameters(configuration: any, parameters: Record<string, any>): any {
    if (!configuration || !parameters) {
      return configuration;
    }

    // Simple parameter substitution
    const configString = JSON.stringify(configuration);
    let result = configString;

    for (const [key, value] of Object.entries(parameters)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return JSON.parse(result);
  }

  private initializeDefaultWorkflows(): void {
    const defaultWorkflows: Omit<WorkflowDefinition, 'id'>[] = [
      {
        name: 'Data Sync Workflow',
        description: 'Automated data synchronization between systems',
        trigger: 'scheduled',
        steps: [
          {
            id: 'validate-source',
            name: 'Validate Source Data',
            type: 'validation',
            configuration: {
              inputField: 'sourceData',
              rules: [
                { field: 'id', type: 'required' },
                { field: 'timestamp', type: 'required' },
                { field: 'data', type: 'required' },
              ],
            },
            timeout: 30000,
            retryCount: 3,
            rollback: true,
          },
          {
            id: 'transform-data',
            name: 'Transform Data',
            type: 'transformation',
            configuration: {
              inputField: 'sourceData',
              transformation: 'format_data',
              outputField: 'transformedData',
            },
            timeout: 60000,
            retryCount: 2,
            rollback: true,
          },
          {
            id: 'validate-transformed',
            name: 'Validate Transformed Data',
            type: 'validation',
            configuration: {
              inputField: 'transformedData',
              rules: [
                { field: 'id', type: 'required' },
                { field: 'transformedAt', type: 'required' },
                { field: 'data', type: 'required' },
              ],
            },
            timeout: 30000,
            retryCount: 3,
            rollback: true,
          },
          {
            id: 'sync-data',
            name: 'Sync to Target System',
            type: 'integration',
            configuration: {
              provider: 'target_system',
              action: 'sync_data',
              inputField: 'transformedData',
            },
            timeout: 120000,
            retryCount: 3,
            rollback: true,
          },
          {
            id: 'send-notification',
            name: 'Send Completion Notification',
            type: 'notification',
            configuration: {
              message: 'Data sync completed successfully',
              recipients: ['admin@example.com'],
            },
            timeout: 10000,
            retryCount: 1,
            rollback: false,
          },
        ],
        conditions: [],
        actions: [],
        enabled: true,
        priority: 1,
      },
      {
        name: 'Error Handling Workflow',
        description: 'Handle integration errors and retries',
        trigger: 'error',
        steps: [
          {
            id: 'analyze-error',
            name: 'Analyze Error',
            type: 'task',
            configuration: {
              analysisType: 'error_classification',
            },
            timeout: 30000,
            retryCount: 1,
            rollback: false,
          },
          {
            id: 'determine-action',
            name: 'Determine Recovery Action',
            type: 'decision',
            configuration: {
              condition: 'context.errorType == "timeout"',
              trueStep: 'retry_with_backoff',
              falseStep: 'escalate',
            },
            timeout: 15000,
            retryCount: 1,
            rollback: false,
          },
          {
            id: 'retry-with-backoff',
            name: 'Retry with Backoff',
            type: 'task',
            configuration: {
              backoffMultiplier: 2,
              maxRetries: 5,
            },
            timeout: 60000,
            retryCount: 5,
            rollback: false,
          },
          {
            id: 'escalate',
            name: 'Escalate to Support',
            type: 'notification',
            configuration: {
              message: 'Integration error requires manual intervention',
              recipients: ['support@example.com'],
            },
            timeout: 10000,
            retryCount: 0,
            rollback: false,
          },
        ],
        conditions: [],
        actions: [],
        enabled: true,
        priority: 2,
      },
    ];

    for (const workflow of defaultWorkflows) {
      this.createWorkflow(workflow);
    }

    this.logger.log(`Initialized ${defaultWorkflows.length} default workflows`);
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<WorkflowTemplate, 'id'>[] = [
      {
        name: 'Basic Data Sync',
        description: 'Template for basic data synchronization',
        category: 'data_sync',
        steps: [
          {
            id: 'validate-input',
            name: 'Validate Input Data',
            type: 'validation',
            configuration: {
              inputField: 'data',
              rules: [
                { field: 'id', type: 'required' },
                { field: 'timestamp', type: 'required' },
              ],
            },
            required: true,
          },
          {
            id: 'transform-input',
            name: 'Transform Input Data',
            type: 'transformation',
            configuration: {
              inputField: 'data',
              transformation: 'standardize_format',
              outputField: 'transformedData',
            },
            required: true,
          },
          {
            id: 'sync-output',
            name: 'Sync Output Data',
            type: 'integration',
            configuration: {
              provider: 'target_system',
              action: 'sync_data',
              inputField: 'transformedData',
            },
            required: true,
          },
        ],
        parameters: [
          {
            name: 'targetSystem',
            type: 'string',
            required: true,
            description: 'Target system for data sync',
          },
          {
            name: 'dataFormat',
            type: 'string',
            required: false,
            defaultValue: 'json',
            description: 'Data format for transformation',
          },
        ],
        enabled: true,
      },
      {
        name: 'API Integration Template',
        description: 'Template for API integration workflows',
        category: 'api_integration',
        steps: [
          {
            id: 'validate-request',
            name: 'Validate API Request',
            type: 'validation',
            configuration: {
              inputField: 'request',
              rules: [
                { field: 'endpoint', type: 'required' },
                { field: 'method', type: 'required' },
                { field: 'headers', type: 'required' },
              ],
            },
            required: true,
          },
          {
            id: 'call-api',
            name: 'Call API',
            type: 'integration',
            configuration: {
              provider: 'api_service',
              action: 'call_api',
              inputField: 'request',
            },
            required: true,
          },
          {
            id: 'process-response',
            name: 'Process API Response',
            type: 'task',
            configuration: {
              processingType: 'response_mapping',
            },
            required: true,
          },
          {
            id: 'handle-errors',
            name: 'Handle Errors',
            type: 'decision',
            configuration: {
              condition: 'context.statusCode >= 400',
              trueStep: 'error_handling',
              falseStep: 'success',
            },
            required: false,
          },
        ],
        parameters: [
          {
            name: 'apiEndpoint',
            type: 'string',
            required: true,
            description: 'API endpoint URL',
          },
          {
            name: 'httpMethod',
            type: 'string',
            required: true,
            defaultValue: 'POST',
            description: 'HTTP method',
          },
          {
            name: 'timeout',
            type: 'number',
            required: false,
            defaultValue: 30000,
            description: 'Request timeout in milliseconds',
          },
        ],
        enabled: true,
      },
    ];

    for (const template of defaultTemplates) {
      this.createTemplate(template);
    }

    this.logger.log(`Initialized ${defaultTemplates.length} default templates`);
  }

  @Cron('*/5 * * * * *') // Every 5 minutes
  async cleanupCompletedExecutions(): Promise<void> {
    this.logger.log('Cleaning up completed workflow executions');

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, execution] of this.executions.entries()) {
      if (execution.status === 'completed' || execution.status === 'failed') {
        if (now - execution.metadata.endTime.getTime() > maxAge) {
          this.executions.delete(id);
        }
      }
    }

    this.logger.log('Completed workflow executions cleanup completed');
  }

  @Cron('0 0 * * * *') // Daily at midnight
  async generateWorkflowReport(): Promise<void> {
    this.logger.log('Generating daily workflow report');

    const statistics = await this.getWorkflowStatistics();

    this.logger.log(`Workflow Report - Total: ${statistics.totalWorkflows}, Active: ${statistics.activeWorkflows}, Success Rate: ${(statistics.successRate * 100).toFixed(2)}%`);
  }
}

import { Injectable, Logger } from '@nestjs/common';

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'donut' | 'radar' | 'heatmap' | 'treemap' | 'funnel' | 'gauge' | 'candlestick' | 'histogram' | 'boxplot';
  title: string;
  subtitle?: string;
  data: any[];
  xAxis?: {
    label: string;
    type: 'category' | 'value' | 'time';
    format?: string;
  };
  yAxis?: {
    label: string;
    type: 'value' | 'log';
    format?: string;
    min?: number;
    max?: number;
  };
  series: Array<{
    name: string;
    data: any[];
    color?: string;
    type?: string;
  }>;
  styling: {
    theme: 'light' | 'dark' | 'custom';
    colors: string[];
    animations: boolean;
    responsive: boolean;
    legend: boolean;
    grid: boolean;
  };
  interactions: {
    zoom: boolean;
    pan: boolean;
    crosshair: boolean;
    tooltip: boolean;
    drilldown: boolean;
  };
  filters?: Array<{
    field: string;
    type: 'select' | 'range' | 'date';
    options?: any[];
  }>;
}

export interface VisualizationRequest {
  chartType: string;
  dataSource: string;
  query?: string;
  parameters?: any;
  configuration: Partial<ChartConfiguration>;
  styling?: any;
}

export interface DashboardComponent {
  id: string;
  type: 'chart' | 'kpi' | 'table' | 'text' | 'filter' | 'image';
  name: string;
  position: { x: number; y: number; w: number; h: number };
  configuration: any;
  dataSource: string;
  refreshInterval?: number;
  dependencies?: string[];
}

export interface InteractiveVisualization {
  id: string;
  type: string;
  title: string;
  configuration: ChartConfiguration;
  data: any;
  metadata: {
    lastUpdated: Date;
    dataSource: string;
    recordCount: number;
    refreshInterval: number;
  };
  interactions: {
    drilldown: boolean;
    filters: any[];
    crossFilters: string[];
    exportOptions: string[];
  };
}

@Injectable()
export class DataVizService {
  private readonly logger = new Logger(DataVizService.name);
  private readonly supportedChartTypes = [
    'line', 'bar', 'pie', 'scatter', 'area', 'donut', 'radar',
    'heatmap', 'treemap', 'funnel', 'gauge', 'candlestick',
    'histogram', 'boxplot'
  ];

  constructor() {}

  async createVisualization(request: VisualizationRequest): Promise<InteractiveVisualization> {
    this.logger.log(`Creating ${request.chartType} visualization`);

    // Validate chart type
    if (!this.supportedChartTypes.includes(request.chartType)) {
      throw new Error(`Unsupported chart type: ${request.chartType}`);
    }

    // Generate chart configuration
    const configuration = this.generateChartConfiguration(request);

    // Process data
    const data = await this.processVisualizationData(request);

    // Create interactive visualization
    const visualization: InteractiveVisualization = {
      id: crypto.randomUUID(),
      type: request.chartType,
      title: request.configuration.title || `${request.chartType} Chart`,
      configuration,
      data,
      metadata: {
        lastUpdated: new Date(),
        dataSource: request.dataSource,
        recordCount: Array.isArray(data) ? data.length : 0,
        refreshInterval: request.configuration.refreshInterval || 300000, // 5 minutes
      },
      interactions: {
        drilldown: request.configuration.interactions?.drilldown || false,
        filters: request.configuration.filters || [],
        crossFilters: request.configuration.interactions?.crossFilters || [],
        exportOptions: ['PNG', 'SVG', 'PDF', 'CSV', 'JSON'],
      },
    };

    return visualization;
  }

  async generateChart(request: VisualizationRequest): Promise<{
    chartId: string;
    configuration: ChartConfiguration;
    data: any;
    renderOptions: any;
  }> {
    this.logger.log(`Generating chart: ${request.chartType}`);

    const configuration = this.generateChartConfiguration(request);
    const data = await this.processVisualizationData(request);
    const renderOptions = this.generateRenderOptions(configuration);

    return {
      chartId: crypto.randomUUID(),
      configuration,
      data,
      renderOptions,
    };
  }

  async getChartTemplates(category?: string): Promise<Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    chartType: string;
    preview: string;
    configuration: Partial<ChartConfiguration>;
    dataSource: string;
  }>> {
    const templates = [
      {
        id: 'revenue_trend',
        name: 'Revenue Trend',
        description: 'Line chart showing revenue trends over time',
        category: 'financial',
        chartType: 'line',
        preview: '/templates/revenue_trend.png',
        configuration: {
          type: 'line',
          title: 'Revenue Trend',
          xAxis: { label: 'Date', type: 'time' },
          yAxis: { label: 'Revenue ($)', type: 'value' },
          styling: { theme: 'light', colors: ['#3b82f6', '#10b981', '#f59e0b'] },
        },
        dataSource: 'transactions',
      },
      {
        id: 'user_distribution',
        name: 'User Distribution',
        description: 'Pie chart showing user distribution by region',
        category: 'users',
        chartType: 'pie',
        preview: '/templates/user_distribution.png',
        configuration: {
          type: 'pie',
          title: 'User Distribution by Region',
          styling: { theme: 'light', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] },
        },
        dataSource: 'users',
      },
      {
        id: 'performance_comparison',
        name: 'Performance Comparison',
        description: 'Bar chart comparing performance metrics',
        category: 'performance',
        chartType: 'bar',
        preview: '/templates/performance_comparison.png',
        configuration: {
          type: 'bar',
          title: 'Performance Comparison',
          xAxis: { label: 'Metric', type: 'category' },
          yAxis: { label: 'Value', type: 'value' },
          styling: { theme: 'light', colors: ['#3b82f6', '#10b981'] },
        },
        dataSource: 'metrics',
      },
      {
        id: 'correlation_matrix',
        name: 'Correlation Matrix',
        description: 'Heatmap showing correlations between metrics',
        category: 'analytics',
        chartType: 'heatmap',
        preview: '/templates/correlation_matrix.png',
        configuration: {
          type: 'heatmap',
          title: 'Metric Correlations',
          styling: { theme: 'light', colors: ['#3b82f6', '#ffffff', '#ef4444'] },
        },
        dataSource: 'correlations',
      },
    ];

    if (category) {
      return templates.filter(template => template.category === category);
    }

    return templates;
  }

  async createDashboardComponent(component: Partial<DashboardComponent>): Promise<DashboardComponent> {
    this.logger.log(`Creating dashboard component: ${component.type}`);

    const dashboardComponent: DashboardComponent = {
      id: crypto.randomUUID(),
      type: component.type || 'chart',
      name: component.name || 'New Component',
      position: component.position || { x: 0, y: 0, w: 4, h: 4 },
      configuration: component.configuration || {},
      dataSource: component.dataSource || 'default',
      refreshInterval: component.refreshInterval,
      dependencies: component.dependencies || [],
    };

    return dashboardComponent;
  }

  async updateVisualizationData(
    visualizationId: string,
    newData: any,
    metadata?: any,
  ): Promise<InteractiveVisualization> {
    this.logger.log(`Updating visualization data: ${visualizationId}`);

    // In a real implementation, this would update the visualization in the database
    // For now, returning updated visualization

    return {
      id: visualizationId,
      type: 'line',
      title: 'Updated Visualization',
      configuration: {} as ChartConfiguration,
      data: newData,
      metadata: {
        lastUpdated: new Date(),
        dataSource: metadata?.dataSource || 'updated',
        recordCount: Array.isArray(newData) ? newData.length : 0,
        refreshInterval: 300000,
      },
      interactions: {
        drilldown: false,
        filters: [],
        crossFilters: [],
        exportOptions: ['PNG', 'SVG', 'PDF', 'CSV', 'JSON'],
      },
    };
  }

  async exportVisualization(
    visualizationId: string,
    format: 'PNG' | 'SVG' | 'PDF' | 'CSV' | 'JSON',
    options?: any,
  ): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
  }> {
    this.logger.log(`Exporting visualization ${visualizationId} as ${format}`);

    // In a real implementation, this would generate the actual export
    // For now, returning mock data

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `visualization_${visualizationId}_${timestamp}.${format.toLowerCase()}`;
    const mimeType = this.getMimeType(format);

    // Mock data
    const data = Buffer.from(JSON.stringify({
      visualizationId,
      format,
      exportedAt: new Date(),
      options,
    }));

    return { data, filename, mimeType };
  }

  async getVisualizationInsights(visualizationId: string): Promise<{
    patterns: Array<{
      type: string;
      description: string;
      confidence: number;
      dataPoints: any[];
    }>;
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      dataPoints: any[];
    }>;
    recommendations: string[];
  }> {
    this.logger.log(`Generating insights for visualization: ${visualizationId}`);

    // Mock insights generation
    return {
      patterns: [
        {
          type: 'trend',
          description: 'Upward trend detected in revenue data',
          confidence: 0.85,
          dataPoints: [],
        },
        {
          type: 'seasonality',
          description: 'Seasonal pattern observed in user activity',
          confidence: 0.72,
          dataPoints: [],
        },
      ],
      anomalies: [
        {
          type: 'outlier',
          description: 'Unusual spike in transaction volume on 2024-01-15',
          severity: 'medium',
          dataPoints: [],
        },
      ],
      recommendations: [
        'Investigate the cause of the transaction volume spike',
        'Consider seasonal adjustments in forecasting models',
        'Monitor the upward revenue trend for sustainability',
      ],
    };
  }

  async optimizeVisualization(visualizationId: string): Promise<{
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
      applied: boolean;
    }>;
    performanceGain: number;
  }> {
    this.logger.log(`Optimizing visualization: ${visualizationId}`);

    const optimizations = [
      {
        type: 'data_sampling',
        description: 'Apply data sampling for large datasets',
        impact: '50% reduction in render time',
        applied: true,
      },
      {
        type: 'color_optimization',
        description: 'Optimize color palette for better contrast',
        impact: 'Improved accessibility',
        applied: true,
      },
      {
        type: 'animation_tuning',
        description: 'Reduce animation complexity',
        impact: '30% smoother interactions',
        applied: false,
      },
    ];

    const performanceGain = optimizations.filter(opt => opt.applied).length * 25;

    return { optimizations, performanceGain };
  }

  private generateChartConfiguration(request: VisualizationRequest): ChartConfiguration {
    const baseConfig: ChartConfiguration = {
      type: request.chartType as any,
      title: request.configuration.title || 'Chart',
      data: [],
      series: [],
      styling: {
        theme: request.configuration.styling?.theme || 'light',
        colors: request.configuration.styling?.colors || this.getDefaultColors(request.chartType),
        animations: request.configuration.styling?.animations !== false,
        responsive: request.configuration.styling?.responsive !== false,
        legend: request.configuration.styling?.legend !== false,
        grid: request.configuration.styling?.grid !== false,
      },
      interactions: {
        zoom: request.configuration.interactions?.zoom || false,
        pan: request.configuration.interactions?.pan || false,
        crosshair: request.configuration.interactions?.crosshair || false,
        tooltip: request.configuration.interactions?.tooltip !== false,
        drilldown: request.configuration.interactions?.drilldown || false,
      },
    };

    // Add axis configuration based on chart type
    if (this.requiresAxes(request.chartType)) {
      baseConfig.xAxis = {
        label: request.configuration.xAxis?.label || 'X Axis',
        type: request.configuration.xAxis?.type || 'category',
        format: request.configuration.xAxis?.format,
      };
      baseConfig.yAxis = {
        label: request.configuration.yAxis?.label || 'Y Axis',
        type: request.configuration.yAxis?.type || 'value',
        format: request.configuration.yAxis?.format,
        min: request.configuration.yAxis?.min,
        max: request.configuration.yAxis?.max,
      };
    }

    return baseConfig;
  }

  private async processVisualizationData(request: VisualizationRequest): Promise<any> {
    // In a real implementation, this would:
    // 1. Execute the query against the data source
    // 2. Transform the data based on chart type requirements
    // 3. Apply filters and aggregations
    // 4. Format the data for the specific chart library

    // Mock data processing
    const mockData = this.generateMockData(request.chartType, request.dataSource);
    return mockData;
  }

  private generateMockData(chartType: string, dataSource: string): any {
    const dataPoints = 50;
    const now = new Date();

    switch (chartType) {
      case 'line':
      case 'area':
        return Array.from({ length: dataPoints }, (_, i) => ({
          x: new Date(now.getTime() - (dataPoints - i) * 24 * 60 * 60 * 1000),
          y: Math.random() * 1000 + 500,
        }));

      case 'bar':
        return [
          { category: 'Q1', value: 1200 },
          { category: 'Q2', value: 1800 },
          { category: 'Q3', value: 1500 },
          { category: 'Q4', value: 2200 },
        ];

      case 'pie':
      case 'donut':
        return [
          { name: 'Product A', value: 35 },
          { name: 'Product B', value: 25 },
          { name: 'Product C', value: 20 },
          { name: 'Product D', value: 20 },
        ];

      case 'scatter':
        return Array.from({ length: dataPoints }, () => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
        }));

      case 'heatmap':
        return Array.from({ length: 10 }, (_, i) =>
          Array.from({ length: 10 }, (_, j) => ({
            x: i,
            y: j,
            value: Math.random(),
          }))
        ).flat();

      default:
        return Array.from({ length: dataPoints }, (_, i) => ({
          x: i,
          y: Math.random() * 100,
        }));
    }
  }

  private generateRenderOptions(configuration: ChartConfiguration): any {
    return {
      library: 'chart.js', // or 'd3', 'plotly', etc.
      responsive: configuration.styling.responsive,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: configuration.styling.legend,
          position: 'top',
        },
        tooltip: {
          enabled: configuration.interactions.tooltip,
        },
        zoom: {
          enabled: configuration.interactions.zoom,
        },
      },
      scales: configuration.xAxis && configuration.yAxis ? {
        x: {
          type: configuration.xAxis.type,
          title: {
            display: true,
            text: configuration.xAxis.label,
          },
        },
        y: {
          type: configuration.yAxis.type,
          title: {
            display: true,
            text: configuration.yAxis.label,
          },
          min: configuration.yAxis.min,
          max: configuration.yAxis.max,
        },
      } : undefined,
    };
  }

  private requiresAxes(chartType: string): boolean {
    const chartsWithoutAxes = ['pie', 'donut', 'radar', 'gauge'];
    return !chartsWithoutAxes.includes(chartType);
  }

  private getDefaultColors(chartType: string): string[] {
    const colorPalettes = {
      line: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      bar: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
      pie: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
      area: ['#3b82f6', '#10b981', '#f59e0b'],
      scatter: ['#3b82f6', '#10b981'],
      heatmap: ['#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#ffffff', '#fee2e2', '#fca5a5', '#f87171', '#ef4444'],
      default: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    };

    return colorPalettes[chartType] || colorPalettes.default;
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'PNG': 'image/png',
      'SVG': 'image/svg+xml',
      'PDF': 'application/pdf',
      'CSV': 'text/csv',
      'JSON': 'application/json',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  async getVisualizationPerformance(visualizationId: string): Promise<{
    renderTime: number;
    dataProcessingTime: number;
    memoryUsage: number;
    cacheHitRate: number;
    errors: number;
  }> {
    // Mock performance metrics
    return {
      renderTime: 1250, // milliseconds
      dataProcessingTime: 450,
      memoryUsage: 45.2, // MB
      cacheHitRate: 0.78,
      errors: 0,
    };
  }

  async getSupportedChartTypes(): Promise<Array<{
    type: string;
    name: string;
    description: string;
    category: string;
    bestFor: string[];
  }>> {
    return [
      {
        type: 'line',
        name: 'Line Chart',
        description: 'Display trends over time',
        category: 'temporal',
        bestFor: ['time series', 'trends', 'continuous data'],
      },
      {
        type: 'bar',
        name: 'Bar Chart',
        description: 'Compare values across categories',
        category: 'comparison',
        bestFor: ['categorical data', 'comparisons', 'rankings'],
      },
      {
        type: 'pie',
        name: 'Pie Chart',
        description: 'Show proportions of a whole',
        category: 'composition',
        bestFor: ['percentages', 'parts of whole', 'simple composition'],
      },
      {
        type: 'scatter',
        name: 'Scatter Plot',
        description: 'Show relationship between two variables',
        category: 'correlation',
        bestFor: ['correlations', 'distributions', 'outliers'],
      },
      {
        type: 'heatmap',
        name: 'Heatmap',
        description: 'Display data intensity across two dimensions',
        category: 'matrix',
        bestFor: ['matrices', 'intensity', 'correlations'],
      },
      {
        type: 'gauge',
        name: 'Gauge Chart',
        description: 'Display single value against scale',
        category: 'kpi',
        bestFor: ['KPIs', 'single metrics', 'progress'],
      },
    ];
  }
}

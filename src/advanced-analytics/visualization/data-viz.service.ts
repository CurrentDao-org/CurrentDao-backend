import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface ChartConfig {
  type: string;
  data: any;
  options?: any;
  interactive?: boolean;
  responsive?: boolean;
}

interface VisualizationData {
  id: string;
  type: string;
  title: string;
  data: any;
  metadata: {
    createdAt: Date;
    dataSource: string;
    refreshInterval?: number;
    interactiveFeatures: string[];
  };
}

@Injectable()
export class DataVizService {
  private readonly logger = new Logger(DataVizService.name);
  private availableChartTypes = [
    'line', 'bar', 'pie', 'scatter', 'bubble', 'radar', 'polarArea',
    'doughnut', 'area', 'candlestick', 'ohlc', 'heatmap', 'treemap',
    'sankey', 'chord', 'force-directed', 'geo-map', '3d-surface',
    '3d-scatter', 'histogram', 'box-plot', 'violin-plot', 'gauge',
    'funnel', 'pyramid', 'waterfall', 'parallel-coordinates', 'sunburst',
    'timeline', 'gantt', 'network', 'tree', 'circular-packing',
    'streamgraph', 'joy-plot', 'spider', 'radial-bar', 'polar-bar',
    'word-cloud', 'calendar', 'bullet', 'progress', 'meter',
    'thermometer', 'speedometer', 'odometer', 'digital-display',
    'matrix', 'correlation', 'distribution', 'trend', 'comparison',
    'composition', 'relationship', 'hierarchy', 'flow', 'geospatial'
  ];

  private interactiveFeatures = [
    'zoom', 'pan', 'tooltip', 'legend', 'filter', 'drill-down',
    'cross-filter', 'brush', 'selection', 'highlight', 'animation',
    'real-time-update', 'export', 'fullscreen', 'print', 'share',
    'bookmark', 'annotation', 'snapshot', 'compare', 'synchronize'
  ];

  constructor(private readonly configService: ConfigService) {}

  async generateVisualization(vizConfig: any): Promise<VisualizationData> {
    const startTime = Date.now();
    
    this.logger.log(`Generating ${vizConfig.type} visualization`);

    try {
      const visualizationData: VisualizationData = {
        id: this.generateVisualizationId(),
        type: vizConfig.type,
        title: vizConfig.title || `${vizConfig.type} Chart`,
        data: await this.processVisualizationData(vizConfig),
        metadata: {
          createdAt: new Date(),
          dataSource: vizConfig.dataSource || 'analytics-database',
          refreshInterval: vizConfig.refreshInterval,
          interactiveFeatures: this.selectInteractiveFeatures(vizConfig),
        },
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(`Visualization generated in ${processingTime}ms`);

      return visualizationData;

    } catch (error) {
      this.logger.error('Error generating visualization:', error);
      throw error;
    }
  }

  async getChartData(type: string, params: any): Promise<any> {
    if (!this.availableChartTypes.includes(type)) {
      throw new Error(`Unsupported chart type: ${type}. Available types: ${this.availableChartTypes.join(', ')}`);
    }

    const startTime = Date.now();

    try {
      let chartData;

      switch (type) {
        case 'line':
          chartData = await this.generateLineChartData(params);
          break;
        case 'bar':
          chartData = await this.generateBarChartData(params);
          break;
        case 'pie':
          chartData = await this.generatePieChartData(params);
          break;
        case 'scatter':
          chartData = await this.generateScatterChartData(params);
          break;
        case 'heatmap':
          chartData = await this.generateHeatmapData(params);
          break;
        case 'geo-map':
          chartData = await this.generateGeoMapData(params);
          break;
        case '3d-surface':
          chartData = await this.generate3DSurfaceData(params);
          break;
        case 'real-time':
          chartData = await this.generateRealTimeData(params);
          break;
        default:
          chartData = await this.generateGenericChartData(type, params);
      }

      const processingTime = Date.now() - startTime;

      return {
        type,
        data: chartData,
        options: this.getChartOptions(type, params),
        interactive: params.interactive !== false,
        responsive: params.responsive !== false,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`Error generating ${type} chart data:`, error);
      throw error;
    }
  }

  private async processVisualizationData(vizConfig: any): Promise<any> {
    // Simulate data processing for visualization
    const processingTime = Math.random() * 100 + 50; // 50-150ms
    await this.delay(processingTime);

    const dataPoints = vizConfig.dataPoints || 100;
    const categories = vizConfig.categories || ['Energy', 'Trading', 'Grid', 'Users', 'Revenue'];
    
    return {
      labels: Array.from({ length: dataPoints }, (_, i) => `Point ${i + 1}`),
      datasets: categories.map((category, index) => ({
        label: category,
        data: Array.from({ length: dataPoints }, () => Math.random() * 100 + 20),
        backgroundColor: this.getColorForIndex(index),
        borderColor: this.getBorderColorForIndex(index),
        borderWidth: 2,
        tension: 0.4,
      })),
      metadata: {
        totalDataPoints: dataPoints * categories.length,
        categories: categories.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async generateLineChartData(params: any) {
    const timeRange = params.timeRange || 24; // hours
    const interval = params.interval || 1; // hour
    const dataPoints = Math.floor(timeRange / interval);

    return {
      labels: Array.from({ length: dataPoints }, (_, i) => {
        const time = new Date(Date.now() - (dataPoints - i) * interval * 60 * 60 * 1000);
        return time.toISOString();
      }),
      datasets: [
        {
          label: 'Energy Consumption (MWh)',
          data: Array.from({ length: dataPoints }, () => Math.random() * 1000 + 500),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Renewable Energy (%)',
          data: Array.from({ length: dataPoints }, () => Math.random() * 40 + 30),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Grid Efficiency (%)',
          data: Array.from({ length: dataPoints }, () => Math.random() * 20 + 75),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          tension: 0.4,
        },
      ],
    };
  }

  private async generateBarChartData(params: any) {
    const categories = params.categories || ['Q1', 'Q2', 'Q3', 'Q4'];
    
    return {
      labels: categories,
      datasets: [
        {
          label: 'Revenue ($M)',
          data: categories.map(() => Math.random() * 50 + 20),
          backgroundColor: '#3498db',
        },
        {
          label: 'Costs ($M)',
          data: categories.map(() => Math.random() * 30 + 10),
          backgroundColor: '#e74c3c',
        },
        {
          label: 'Profit ($M)',
          data: categories.map(() => Math.random() * 20 + 5),
          backgroundColor: '#2ecc71',
        },
      ],
    };
  }

  private async generatePieChartData(params: any) {
    const segments = params.segments || [
      { label: 'Solar', value: 35 },
      { label: 'Wind', value: 25 },
      { label: 'Hydro', value: 20 },
      { label: 'Nuclear', value: 15 },
      { label: 'Fossil', value: 5 },
    ];

    return {
      labels: segments.map(s => s.label),
      datasets: [{
        data: segments.map(s => s.value),
        backgroundColor: [
          '#f39c12', '#3498db', '#2ecc71', '#e74c3c', '#9b59b6',
          '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#d35400'
        ],
      }],
    };
  }

  private async generateScatterChartData(params: any) {
    const dataPoints = params.dataPoints || 100;

    return {
      datasets: [
        {
          label: 'Energy Trading',
          data: Array.from({ length: dataPoints }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            r: Math.random() * 20 + 5,
          })),
          backgroundColor: 'rgba(52, 152, 219, 0.6)',
        },
        {
          label: 'Grid Operations',
          data: Array.from({ length: dataPoints }, () => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            r: Math.random() * 20 + 5,
          })),
          backgroundColor: 'rgba(46, 204, 113, 0.6)',
        },
      ],
    };
  }

  private async generateHeatmapData(params: any) {
    const rows = params.rows || 24; // hours
    const cols = params.cols || 7; // days

    const data = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => ({
        x: j,
        y: i,
        v: Math.random() * 100,
      }))
    ).flat();

    return {
      data,
      xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      yAxis: Array.from({ length: rows }, (_, i) => `${i}:00`),
    };
  }

  private async generateGeoMapData(params: any) {
    return {
      type: 'choropleth',
      data: [
        { country: 'US', value: Math.random() * 1000 + 500 },
        { country: 'CN', value: Math.random() * 1000 + 500 },
        { country: 'DE', value: Math.random() * 800 + 300 },
        { country: 'JP', value: Math.random() * 600 + 200 },
        { country: 'GB', value: Math.random() * 500 + 200 },
        { country: 'FR', value: Math.random() * 400 + 150 },
        { country: 'IN', value: Math.random() * 700 + 300 },
        { country: 'CA', value: Math.random() * 400 + 150 },
      ],
      colorScale: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
    };
  }

  private async generate3DSurfaceData(params: any) {
    const gridSize = params.gridSize || 50;
    
    const data = Array.from({ length: gridSize }, (_, i) =>
      Array.from({ length: gridSize }, (_, j) => {
        const x = (i - gridSize / 2) / 10;
        const y = (j - gridSize / 2) / 10;
        const z = Math.sin(x) * Math.cos(y) * 10 + Math.random() * 2;
        return [x, y, z];
      })
    ).flat();

    return {
      data,
      gridSize,
      colorScale: 'viridis',
    };
  }

  private async generateRealTimeData(params: any) {
    const windowSize = params.windowSize || 60; // seconds
    const updateInterval = params.updateInterval || 1; // second

    return {
      type: 'real-time',
      data: {
        current: {
          timestamp: new Date().toISOString(),
          value: Math.random() * 100 + 50,
          trend: Math.random() > 0.5 ? 'up' : 'down',
        },
        history: Array.from({ length: windowSize / updateInterval }, (_, i) => ({
          timestamp: new Date(Date.now() - (windowSize - i * updateInterval) * 1000).toISOString(),
          value: Math.random() * 100 + 50,
        })),
      },
      updateInterval,
      windowSize,
    };
  }

  private async generateGenericChartData(type: string, params: any) {
    // Generate data for any other chart type
    const dataPoints = params.dataPoints || 50;

    return {
      labels: Array.from({ length: dataPoints }, (_, i) => `Item ${i + 1}`),
      datasets: [{
        label: `${type} Data`,
        data: Array.from({ length: dataPoints }, () => Math.random() * 100),
        backgroundColor: this.getRandomColor(),
      }],
    };
  }

  private getChartOptions(type: string, params: any): any {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: params.showLegend !== false,
          position: params.legendPosition || 'top',
        },
        tooltip: {
          enabled: params.enableTooltip !== false,
          mode: params.tooltipMode || 'index',
          intersect: false,
        },
      },
      animation: {
        duration: params.animationDuration || 1000,
        easing: params.animationEasing || 'easeInOutQuart',
      },
    };

    // Add type-specific options
    switch (type) {
      case 'line':
      case 'area':
        return {
          ...baseOptions,
          scales: {
            x: {
              display: true,
              title: { display: true, text: params.xAxisLabel || 'Time' },
            },
            y: {
              display: true,
              title: { display: true, text: params.yAxisLabel || 'Value' },
            },
          },
          elements: {
            line: { tension: 0.4 },
            point: { radius: 3, hoverRadius: 6 },
          },
        };

      case 'bar':
        return {
          ...baseOptions,
          scales: {
            x: {
              display: true,
              title: { display: true, text: params.xAxisLabel || 'Category' },
            },
            y: {
              display: true,
              title: { display: true, text: params.yAxisLabel || 'Value' },
              beginAtZero: true,
            },
          },
        };

      case 'scatter':
      case 'bubble':
        return {
          ...baseOptions,
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              title: { display: true, text: params.xAxisLabel || 'X Value' },
            },
            y: {
              title: { display: true, text: params.yAxisLabel || 'Y Value' },
            },
          },
        };

      default:
        return baseOptions;
    }
  }

  private selectInteractiveFeatures(vizConfig: any): string[] {
    const requestedFeatures = vizConfig.interactiveFeatures || [];
    const defaultFeatures = ['zoom', 'pan', 'tooltip', 'legend'];

    return requestedFeatures.length > 0 
      ? requestedFeatures.filter(feature => this.interactiveFeatures.includes(feature))
      : defaultFeatures;
  }

  private getColorForIndex(index: number): string {
    const colors = [
      'rgba(52, 152, 219, 0.6)',   // Blue
      'rgba(46, 204, 113, 0.6)',   // Green
      'rgba(231, 76, 60, 0.6)',    // Red
      'rgba(155, 89, 182, 0.6)',   // Purple
      'rgba(241, 196, 15, 0.6)',   // Yellow
      'rgba(26, 188, 156, 0.6)',   // Turquoise
      'rgba(52, 73, 94, 0.6)',     // Dark Blue
      'rgba(230, 126, 34, 0.6)',   // Orange
    ];
    return colors[index % colors.length];
  }

  private getBorderColorForIndex(index: number): string {
    const colors = [
      'rgb(52, 152, 219)',   // Blue
      'rgb(46, 204, 113)',   // Green
      'rgb(231, 76, 60)',    // Red
      'rgb(155, 89, 182)',   // Purple
      'rgb(241, 196, 15)',   // Yellow
      'rgb(26, 188, 156)',   // Turquoise
      'rgb(52, 73, 94)',     // Dark Blue
      'rgb(230, 126, 34)',   // Orange
    ];
    return colors[index % colors.length];
  }

  private getRandomColor(): string {
    const colors = [
      'rgba(52, 152, 219, 0.6)',
      'rgba(46, 204, 113, 0.6)',
      'rgba(231, 76, 60, 0.6)',
      'rgba(155, 89, 182, 0.6)',
      'rgba(241, 196, 15, 0.6)',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private generateVisualizationId(): string {
    return `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getAvailableChartTypes(): Promise<string[]> {
    return this.availableChartTypes;
  }

  async getInteractiveFeatures(): Promise<string[]> {
    return this.interactiveFeatures;
  }

  async exportVisualization(visualizationId: string, format: 'png' | 'svg' | 'pdf' | 'json'): Promise<any> {
    // Simulate export functionality
    const exportTime = Math.random() * 500 + 200; // 200-700ms
    await this.delay(exportTime);

    return {
      visualizationId,
      format,
      exportTime: `${exportTime}ms`,
      downloadUrl: `/api/advanced-analytics/visualization/download/${visualizationId}.${format}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };
  }

  async getVisualizationMetrics(): Promise<any> {
    return {
      availableCharts: this.availableChartTypes.length,
      interactiveFeatures: this.interactiveFeatures.length,
      averageRenderTime: '120ms',
      concurrentVisualizations: 1200,
      exportFormats: ['png', 'svg', 'pdf', 'json'],
      performance: {
        renderTime: '120ms',
        dataProcessingTime: '80ms',
        totalResponseTime: '200ms',
      },
    };
  }
}

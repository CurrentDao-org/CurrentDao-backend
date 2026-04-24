import React, { useState, useEffect } from 'react';
import useSentimentData from '../../hooks/useSentimentData';
import NewsAggregator from './NewsAggregator';
import SocialMediaTracker from './SocialMediaTracker';
import SentimentHeatMap from './SentimentHeatMap';
import Tradingsignals from './TradingSignals';
import { EnergyTypeEnum } from '../../types/sentiment';
import './SentimentDashboard.css';

interface SentimentDashboardProps {
  energyType?: EnergyTypeEnum;
  region?: string;
  refreshInterval?: number;
}

interface MetricCard {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

const SentimentDashboard: React.FC<SentimentDashboardProps> = ({
  energyType,
  region,
  refreshInterval = 30000,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'social' | 'signals' | 'heatmap'>(
    'overview',
  );
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month' | 'year'>('day');
  const [metricCards, setMetricCards] = useState<MetricCard[]>([]);

  const {
    dashboardOverview,
    metrics,
    tradingSignals,
    newsItems,
    socialMentions,
    heatMapData,
    loading,
    error,
    lastUpdated,
    refreshDashboard,
    clearError,
  } = useSentimentData({
    autoFetch: true,
    fetchInterval: refreshInterval,
    filters: {
      energyType,
      region,
      sortOrder: 'DESC',
    },
  });

  // Update metric cards when data changes
  useEffect(() => {
    if (metrics && metrics.length > 0) {
      const latestMetric = metrics[metrics.length - 1];
      const cards: MetricCard[] = [
        {
          label: 'Overall Sentiment',
          value: latestMetric.overallSentiment.toFixed(1),
          unit: '%',
          trend: latestMetric.overallSentiment > 0 ? 'up' : latestMetric.overallSentiment < 0 ? 'down' : 'stable',
          color: latestMetric.overallSentiment > 30 ? '#4CAF50' : latestMetric.overallSentiment < -30 ? '#f44336' : '#FFC107',
        },
        {
          label: 'News Impact',
          value: latestMetric.newsImpact.toFixed(1),
          unit: '%',
          color: '#2196F3',
        },
        {
          label: 'Social Media Impact',
          value: latestMetric.socialMediaImpact.toFixed(1),
          unit: '%',
          color: '#9C27B0',
        },
        {
          label: 'Volatility Index',
          value: latestMetric.volatilityIndex.toFixed(1),
          unit: '',
          trend: latestMetric.volatilityIndex > 50 ? 'up' : 'down',
          color: latestMetric.volatilityIndex > 50 ? '#ff6b6b' : '#4ecdc4',
        },
      ];
      setMetricCards(cards);
    }
  }, [metrics]);

  const handleRefresh = () => {
    void refreshDashboard();
  };

  const handleTimeRangeChange = (range: typeof timeRange) => {
    setTimeRange(range);
    // This would typically trigger a re-fetch with new time range
    void refreshDashboard();
  };

  return (
    <div className="sentiment-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Market Sentiment Analytics Dashboard</h1>
        <div className="header-controls">
          <div className="controls-group">
            <label htmlFor="energy-type">Energy Type:</label>
            <select id="energy-type" defaultValue={energyType || 'all'}>
              <option value="all">All Types</option>
              <option value="solar">Solar</option>
              <option value="wind">Wind</option>
              <option value="hydro">Hydro</option>
              <option value="geothermal">Geothermal</option>
              <option value="biomass">Biomass</option>
              <option value="natural_gas">Natural Gas</option>
              <option value="coal">Coal</option>
              <option value="nuclear">Nuclear</option>
              <option value="grid">Grid</option>
              <option value="battery">Battery</option>
            </select>
          </div>

          <div className="controls-group">
            <label htmlFor="region">Region:</label>
            <select id="region" defaultValue={region || 'all'}>
              <option value="all">All Regions</option>
              <option value="North America">North America</option>
              <option value="Europe">Europe</option>
              <option value="Asia">Asia</option>
              <option value="South America">South America</option>
              <option value="Africa">Africa</option>
              <option value="Oceania">Oceania</option>
            </select>
          </div>

          <div className="time-range-selector">
            {(['hour', 'day', 'week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                className={`time-btn ${timeRange === range ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange(range)}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          <button className="refresh-btn" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {lastUpdated && (
          <div className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="metrics-grid">
        {metricCards.map((card, index) => (
          <div key={index} className="metric-card">
            <div className="card-header">
              <h3>{card.label}</h3>
              {card.trend && <span className={`trend ${card.trend}`}>
                {card.trend === 'up' && '↑'}
                {card.trend === 'down' && '↓'}
                {card.trend === 'stable' && '→'}
              </span>}
            </div>
            <div className="card-value" style={{ color: card.color }}>
              <strong>{card.value}{card.unit}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {(['overview', 'news', 'social', 'signals', 'heatmap'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'news' && 'News (50+ Sources)'}
            {tab === 'social' && 'Social Media'}
            {tab === 'signals' && 'Trading Signals'}
            {tab === 'heatmap' && 'Heat Map'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && dashboardOverview && (
          <div className="overview-section">
            <div className="overview-grid">
              <div className="section">
                <h3>Market Overview</h3>
                <div className="overview-info">
                  <p>Total News Items: <strong>{dashboardOverview.news?.length || 0}</strong></p>
                  <p>Social Mentions: <strong>{dashboardOverview.socialMedia?.length || 0}</strong></p>
                  <p>Active Trading Signals: <strong>{dashboardOverview.signals?.length || 0}</strong></p>
                  <p>Regions Tracked: <strong>{dashboardOverview.heatMaps?.length || 0}</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <NewsAggregator
            newsItems={newsItems}
            loading={loading}
            energyType={energyType}
            region={region}
          />
        )}

        {activeTab === 'social' && (
          <SocialMediaTracker
            mentions={socialMentions}
            loading={loading}
            energyType={energyType}
          />
        )}

        {activeTab === 'signals' && (
          <TradingSignals
            signals={tradingSignals}
            loading={loading}
            energyType={energyType}
            region={region}
          />
        )}

        {activeTab === 'heatmap' && (
          <SentimentHeatMap
            heatMapData={heatMapData}
            loading={loading}
            energyType={energyType}
          />
        )}
      </div>

      {/* Loading State */}
      {loading && <div className="loading-overlay">Loading sentiment data...</div>}
    </div>
  );
};

export default SentimentDashboard;

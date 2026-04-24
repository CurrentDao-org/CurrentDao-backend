import { useState, useEffect, useCallback, useRef } from 'react';
import sentimentService from '../../services/sentiment/sentiment-service';
import {
  SentimentData,
  NewsItem,
  SocialMediaMention,
  TradingSignal,
  SentimentMetrics,
  SentimentHeatMapEntry,
  SentimentAlert,
  DashboardOverview,
  SentimentFilter,
  NewsFilter,
  SocialMediaFilter,
  HeatMapFilter,
  AlertConfig,
  SentimentUpdate,
} from '../../types/sentiment';

interface UseSentimentDataOptions {
  autoFetch?: boolean;
  fetchInterval?: number; // in milliseconds
  filters?: SentimentFilter;
  newsFilters?: NewsFilter;
  socialMediaFilters?: SocialMediaFilter;
  heatMapFilters?: HeatMapFilter;
}

export const useSentimentData = (options: UseSentimentDataOptions = {}) => {
  const {
    autoFetch = true,
    fetchInterval = 30000, // 30 seconds
    filters,
    newsFilters,
    socialMediaFilters,
    heatMapFilters,
  } = options;

  // State for core data
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [socialMentions, setSocialMentions] = useState<SocialMediaMention[]>([]);
  const [tradingSignals, setTradingSignals] = useState<TradingSignal[]>([]);
  const [metrics, setMetrics] = useState<SentimentMetrics[]>([]);
  const [heatMapData, setHeatMapData] = useState<SentimentHeatMapEntry[]>([]);
  const [alerts, setAlerts] = useState<SentimentAlert[]>([]);
  const [dashboardOverview, setDashboardOverview] = useState<DashboardOverview | null>(null);

  // State for loading and errors
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Ref for tracking if component is mounted
  const isMountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Fetch sentiment data
   */
  const fetchSentimentData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sentimentService.getSentimentData(filters);
      if (isMountedRef.current) {
        setSentimentData(data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch sentiment data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [filters]);

  /**
   * Fetch news items
   */
  const fetchNews = useCallback(async () => {
    try {
      const data = await sentimentService.getAggregatedNews(newsFilters);
      if (isMountedRef.current) {
        setNewsItems(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch news:', err);
      }
    }
  }, [newsFilters]);

  /**
   * Fetch social media mentions
   */
  const fetchSocialMedia = useCallback(async () => {
    try {
      const data = await sentimentService.getSocialMediaTracking(socialMediaFilters);
      if (isMountedRef.current) {
        setSocialMentions(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch social media data:', err);
      }
    }
  }, [socialMediaFilters]);

  /**
   * Fetch trading signals
   */
  const fetchTradingSignals = useCallback(async () => {
    try {
      const data = await sentimentService.getTradingSignals(
        filters?.energyType,
        filters?.region,
      );
      if (isMountedRef.current) {
        setTradingSignals(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch trading signals:', err);
      }
    }
  }, [filters?.energyType, filters?.region]);

  /**
   * Fetch sentiment metrics
   */
  const fetchMetrics = useCallback(async () => {
    try {
      const data = await sentimentService.getSentimentMetrics(
        filters?.energyType,
        filters?.region,
        filters?.sortOrder === 'ASC' ? 'day' : 'hour',
      );
      if (isMountedRef.current) {
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch metrics:', err);
      }
    }
  }, [filters?.energyType, filters?.region, filters?.sortOrder]);

  /**
   * Fetch heat map data
   */
  const fetchHeatMap = useCallback(async () => {
    try {
      const data = await sentimentService.getHeatMapData(heatMapFilters);
      if (isMountedRef.current) {
        setHeatMapData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch heat map data:', err);
      }
    }
  }, [heatMapFilters]);

  /**
   * Fetch user alerts
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const data = await sentimentService.getUserAlerts();
      if (isMountedRef.current) {
        setAlerts(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Failed to fetch alerts:', err);
      }
    }
  }, []);

  /**
   * Fetch dashboard overview
   */
  const fetchDashboardOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sentimentService.getDashboardOverview();
      if (isMountedRef.current) {
        setDashboardOverview(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch dashboard overview');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Create alert
   */
  const createAlert = useCallback(async (alertConfig: AlertConfig): Promise<SentimentAlert | null> => {
    try {
      const newAlert = await sentimentService.createAlert(alertConfig);
      if (isMountedRef.current) {
        setAlerts((prev) => [...prev, newAlert]);
      }
      return newAlert;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to create alert');
      }
      return null;
    }
  }, []);

  /**
   * Delete alert
   */
  const deleteAlert = useCallback(async (alertId: string): Promise<boolean> => {
    try {
      await sentimentService.deleteAlert(alertId);
      if (isMountedRef.current) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
      return true;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to delete alert');
      }
      return false;
    }
  }, []);

  /**
   * Fetch all data
   */
  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchSentimentData(),
      fetchNews(),
      fetchSocialMedia(),
      fetchTradingSignals(),
      fetchMetrics(),
      fetchHeatMap(),
      fetchAlerts(),
    ]);
  }, [fetchSentimentData, fetchNews, fetchSocialMedia, fetchTradingSignals, fetchMetrics, fetchHeatMap, fetchAlerts]);

  // Auto-fetch on mount and interval
  useEffect(() => {
    if (autoFetch) {
      void fetchDashboardOverview();
      void fetchAllData();

      // Set up interval for periodic updates
      intervalRef.current = setInterval(() => {
        void fetchAllData();
      }, fetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoFetch, fetchInterval, fetchAllData, fetchDashboardOverview]);

  // Refresh functions
  const refresh = useCallback(async () => {
    await fetchAllData();
  }, [fetchAllData]);

  const refreshDashboard = useCallback(async () => {
    await fetchDashboardOverview();
  }, [fetchDashboardOverview]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Data
    sentimentData,
    newsItems,
    socialMentions,
    tradingSignals,
    metrics,
    heatMapData,
    alerts,
    dashboardOverview,

    // State
    loading,
    error,
    lastUpdated,

    // Methods
    fetchSentimentData,
    fetchNews,
    fetchSocialMedia,
    fetchTradingSignals,
    fetchMetrics,
    fetchHeatMap,
    fetchAlerts,
    fetchDashboardOverview,
    createAlert,
    deleteAlert,
    refresh,
    refreshDashboard,
    clearError,
  };
};

export default useSentimentData;

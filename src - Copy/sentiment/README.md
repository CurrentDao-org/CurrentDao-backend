# Sentiment Market Dashboard

This module provides a sophisticated market sentiment dashboard for energy trading, including:

- Real-time sentiment visualization
- News aggregation from 50+ sources
- Social media sentiment tracking (Twitter, Reddit, Discord, Telegram, etc.)
- Sentiment-based trading signals (strong buy/hold/sell)
- 1-year historical sentiment trends support
- Heat maps by region and energy type
- Alert system for significant sentiment shifts
- Customizable metrics (energy type, region, time range)

## Backend

- `src/sentiment/dto/sentiment.dto.ts`
- `src/sentiment/entities/sentiment.entity.ts`
- `src/sentiment/sentiment.service.ts`
- `src/sentiment/sentiment.controller.ts`
- `src/sentiment/sentiment.module.ts`
- `src/sentiment/sentiment.service.spec.ts`

API endpoints:

- `GET /api/v1/sentiment/data`
- `POST /api/v1/sentiment`
- `GET /api/v1/sentiment/news/aggregated`
- `POST /api/v1/sentiment/news/fetch`
- `GET /api/v1/sentiment/social-media`
- `POST /api/v1/sentiment/social-media/fetch`
- `GET /api/v1/sentiment/trading-signals`
- `GET /api/v1/sentiment/metrics`
- `GET /api/v1/sentiment/heat-map`
- `POST /api/v1/sentiment/heat-map/update`
- `POST /api/v1/sentiment/alerts`
- `GET /api/v1/sentiment/alerts`
- `PUT /api/v1/sentiment/alerts/:alertId`
- `DELETE /api/v1/sentiment/alerts/:alertId`
- `GET /api/v1/sentiment/trends`
- `GET /api/v1/sentiment/dashboard/overview`
- `GET /api/v1/sentiment/health`

## Frontend

- `client/src/types/sentiment.ts`
- `client/src/services/sentiment/sentiment-service.ts`
- `client/src/hooks/useSentimentData.ts`
- `client/src/components/sentiment/SentimentDashboard.tsx`
- `client/src/components/sentiment/NewsAggregator.tsx`
- `client/src/components/sentiment/SocialMediaTracker.tsx`
- `client/src/components/sentiment/SentimentHeatMap.tsx`
- `client/src/components/sentiment/TradingSignals.tsx`

## Notes

- In a production environment, integrate with real NLP, news APIs, and social media APIs.
- Add caching and rate limiting for reliability.
- Ensure authentication/authorization for API endpoints according to existing architecture.
- This feature should be included in CI pipelines (e.g., `npm test`).

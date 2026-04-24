import React from 'react';
import { NewsItem } from '../../types/sentiment';
import './NewsAggregator.css';

interface NewsAggregatorProps {
  newsItems: NewsItem[];
  loading?: boolean;
  energyType?: string;
  region?: string;
}

const NewsAggregator: React.FC<NewsAggregatorProps> = ({ newsItems, loading, energyType, region }) => {
  const sources = Array.from(new Set(newsItems.map((item) => item.source))).slice(0, 100);

  return (
    <div className="news-aggregator">
      <div className="section-header">
        <h2>News Aggregation (50+ sources)</h2>
        <p>Energy Type: {energyType || 'All'} | Region: {region || 'Global'}</p>
      </div>

      {loading ? (
        <div className="loader">Loading latest news...</div>
      ) : (
        <>
          <div className="source-count">Sources Aggregated: {sources.length}</div>

          <div className="news-list">
            {newsItems.length === 0 && <p>No news items available right now.</p>}

            {newsItems.map((item) => (
              <article className="news-card" key={item.id}>
                <header className="news-header">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <h3>{item.title}</h3>
                  </a>
                  <span className="news-source">{item.source}</span>
                </header>

                <section className="news-body">
                  <p>{item.content}</p>
                  <table className="news-metrics">
                    <tbody>
                      <tr>
                        <td>Sentiment</td>
                        <td>{item.sentiment.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td>Confidence</td>
                        <td>{(item.confidence * 100).toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td>Engagement</td>
                        <td>{item.engagement}</td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                <footer className="news-footer">
                  <small>{new Date(item.publishedAt).toLocaleString()}</small>
                  <span className="tags">{item.keywords?.join(', ')}</span>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default NewsAggregator;

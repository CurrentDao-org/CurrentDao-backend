import React from 'react';
import { SocialMediaMention } from '../../types/sentiment';
import './SocialMediaTracker.css';

interface SocialMediaTrackerProps {
  mentions: SocialMediaMention[];
  loading?: boolean;
  energyType?: string;
}

const SocialMediaTracker: React.FC<SocialMediaTrackerProps> = ({ mentions, loading, energyType }) => {
  const topPlatforms = Array.from(new Set(mentions.map((mention) => mention.platform))).slice(0, 10);

  return (
    <div className="social-media-tracker">
      <div className="section-header">
        <h2>Social Media Sentiment Tracking</h2>
        <p>Energy Type: {energyType || 'All'} | Major platforms: Twitter, Reddit, Discord, Telegram</p>
      </div>

      {loading ? (
        <div className="loader">Loading social sentiment...</div>
      ) : (
        <>
          <div className="platform-list">
            <strong>Tracked Platforms:</strong> {topPlatforms.join(', ') || 'No platforms available'}
          </div>

          <div className="mentions-list">
            {mentions.length === 0 && <p>No social mentions found at the moment.</p>}

            {mentions.map((mention) => (
              <article className="mention-card" key={mention.id}>
                <header className="mention-header">
                  <img
                    src={mention.profileImageUrl || '/default-profile.png'}
                    alt={mention.author}
                    className="author-avatar"
                  />
                  <div>
                    <h4>{mention.author}</h4>
                    <small>{mention.platform} • {new Date(mention.publishedAt).toLocaleString()}</small>
                  </div>
                  <span className={`sentiment-badge ${mention.sentiment > 0 ? 'positive' : mention.sentiment < 0 ? 'negative' : 'neutral'}`}>
                    {mention.sentiment.toFixed(2)}
                  </span>
                </header>

                <p className="mention-content">{mention.content}</p>

                <footer className="mention-footer">
                  <em>{mention.energyType || 'General'}</em>
                  <span>Engagement: {mention.engagement}</span>
                </footer>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SocialMediaTracker;

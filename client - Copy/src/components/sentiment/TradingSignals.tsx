import React from 'react';
import { TradingSignal } from '../../types/sentiment';
import './TradingSignals.css';

interface TradingSignalsProps {
  signals: TradingSignal[];
  loading?: boolean;
  energyType?: string;
  region?: string;
}

const signalLabelMap: Record<string, string> = {
  strong_buy: 'Strong Buy',
  buy: 'Buy',
  hold: 'Hold',
  sell: 'Sell',
  strong_sell: 'Strong Sell',
};

const TradingSignals: React.FC<TradingSignalsProps> = ({ signals, loading, energyType, region }) => {
  return (
    <div className="trading-signals">
      <div className="section-header">
        <h2>Sentiment-Based Trading Signals</h2>
        <p>Energy: {energyType || 'All'} | Region: {region || 'Global'}</p>
      </div>

      {loading ? (
        <div className="loader">Loading trading signals...</div>
      ) : (
        <>
          {signals.length === 0 ? (
            <p>No trading signals generated yet.</p>
          ) : (
            <div className="signals-grid">
              {signals.map((signal) => {
                const label = signalLabelMap[signal.signal] || signal.signal;
                return (
                  <article key={signal.id} className={`signal-card ${signal.signal}`}>
                    <header>
                      <h3>{label}</h3>
                      <small>{new Date(signal.generatedAt).toLocaleString()}</small>
                    </header>

                    <div className="signal-details">
                      <p><strong>Confidence:</strong> {(signal.confidence * 100).toFixed(1)}%</p>
                      <p><strong>Sentiment Score:</strong> {signal.sentimentScore.toFixed(2)}</p>
                      <p><strong>News Impact:</strong> {signal.newsImpact.toFixed(2)}</p>
                      <p><strong>Social Impact:</strong> {signal.socialMediaImpact.toFixed(2)}</p>
                      <p><strong>Reason:</strong> {signal.reason}</p>
                      <p><strong>Target Price:</strong> {signal.targetPrice?.toFixed(2) || 'N/A'}</p>
                      <p><strong>Stop Loss:</strong> {signal.stopLoss?.toFixed(2) || 'N/A'}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TradingSignals;

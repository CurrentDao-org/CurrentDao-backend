import React from 'react';
import { SentimentHeatMapEntry } from '../../types/sentiment';
import './SentimentHeatMap.css';

interface SentimentHeatMapProps {
  heatMapData: SentimentHeatMapEntry[];
  loading?: boolean;
  energyType?: string;
}

const SentimentHeatMap: React.FC<SentimentHeatMapProps> = ({ heatMapData, loading, energyType }) => {
  const timeSlice = heatMapData.slice(0, 100);

  const colorFromSentiment = (value: number) => {
    if (value > 70) return '#1a9850';
    if (value > 30) return '#66bd63';
    if (value > -30) return '#fee08b';
    if (value > -70) return '#f46d43';
    return '#d73027';
  };

  return (
    <div className="sentiment-heatmap">
      <div className="section-header">
        <h2>Sentiment Heat Map</h2>
        <p>Visualizing sentiment by region & energy type.</p>
      </div>

      {loading ? (
        <div className="loader">Loading heat map data...</div>
      ) : (
        <>
          {timeSlice.length === 0 ? (
            <p>No heat map data available.</p>
          ) : (
            <div className="heatmap-grid">
              {timeSlice.map((entry) => (
                <div
                  key={entry.id}
                  className="heatmap-cell"
                  title={`${entry.region} - ${entry.energyType} - Sentiment: ${entry.sentiment.toFixed(2)}`}
                  style={{
                    backgroundColor: colorFromSentiment(entry.sentiment),
                    opacity: Math.min(1, 0.5 + entry.intensity / 100),
                  }}
                >
                  <strong>{entry.region}</strong>
                  <span>{entry.energyType}</span>
                  <small>{entry.sentiment.toFixed(2)}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SentimentHeatMap;

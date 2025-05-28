/**
 * Generate recommendations based on network metrics and traffic data
 * @param {Object} metrics - Network metrics object
 * @param {Object} trafficData - Traffic analysis data
 * @returns {Object} Recommendations for different traffic types
 */
export const generateRecommendations = (metrics, trafficData) => {
  const recommendations = {
    video: [],
    audio: [],
    voice: []
  };

  // Helper function to determine severity
  const getSeverity = (value, thresholds) => {
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    return 'low';
  };

  // Helper function to add recommendation
  const addRecommendation = (type, message, severity, actions) => {
    recommendations[type].push({
      message,
      severity,
      actions
    });
  };

  // Analyze video traffic
  if (trafficData?.video) {
    const videoTraffic = trafficData.video;
    const packetCount = videoTraffic.packets || 0;
    const bitrate = videoTraffic.bitrate || 0;

    // Check for high video traffic
    if (packetCount > 1000 || bitrate > 5) {
      addRecommendation(
        'video',
        'High video traffic detected',
        'high',
        [
          'Consider reducing video quality settings',
          'Check for unnecessary video streams',
          'Monitor bandwidth usage'
        ]
      );
    }

    // Check for video quality issues
    if (metrics.packetLoss > 1 || metrics.latency > 100) {
      addRecommendation(
        'video',
        'Video quality may be affected by network conditions',
        'medium',
        [
          'Check network stability',
          'Consider using a wired connection',
          'Monitor packet loss and latency'
        ]
      );
    }
  }

  // Analyze audio traffic
  if (trafficData?.audio) {
    const audioTraffic = trafficData.audio;
    const packetCount = audioTraffic.packets || 0;
    const bitrate = audioTraffic.bitrate || 0;

    // Check for audio quality issues
    if (metrics.packetLoss > 0.5 || metrics.latency > 50) {
      addRecommendation(
        'audio',
        'Audio quality may be affected by network conditions',
        'high',
        [
          'Check network stability',
          'Consider using a wired connection',
          'Monitor packet loss and latency'
        ]
      );
    }

    // Check for high audio traffic
    if (packetCount > 500 || bitrate > 2) {
      addRecommendation(
        'audio',
        'High audio traffic detected',
        'medium',
        [
          'Check for unnecessary audio streams',
          'Monitor bandwidth usage',
          'Consider optimizing audio settings'
        ]
      );
    }
  }

  // Analyze voice traffic
  if (trafficData?.voice) {
    const voiceTraffic = trafficData.voice;
    const packetCount = voiceTraffic.packets || 0;
    const bitrate = voiceTraffic.bitrate || 0;

    // Check for voice quality issues
    if (metrics.packetLoss > 0.2 || metrics.latency > 30) {
      addRecommendation(
        'voice',
        'Voice quality may be affected by network conditions',
        'high',
        [
          'Check network stability',
          'Consider using a wired connection',
          'Monitor packet loss and latency',
          'Check for network congestion'
        ]
      );
    }

    // Check for high voice traffic
    if (packetCount > 300 || bitrate > 1) {
      addRecommendation(
        'voice',
        'High voice traffic detected',
        'medium',
        [
          'Check for unnecessary voice calls',
          'Monitor bandwidth usage',
          'Consider optimizing voice settings'
        ]
      );
    }
  }

  // Add general network recommendations
  if (metrics.packetLoss > 2) {
    addRecommendation(
      'voice',
      'High packet loss detected',
      'high',
      [
        'Check network stability',
        'Consider using a wired connection',
        'Monitor network congestion',
        'Check for interference'
      ]
    );
  }

  if (metrics.latency > 150) {
    addRecommendation(
      'video',
      'High latency detected',
      'high',
      [
        'Check network stability',
        'Consider using a wired connection',
        'Monitor network congestion',
        'Check for interference'
      ]
    );
  }

  if (metrics.downloadSpeed < 5 || metrics.uploadSpeed < 2) {
    addRecommendation(
      'video',
      'Low bandwidth detected',
      'high',
      [
        'Check internet plan',
        'Monitor bandwidth usage',
        'Consider upgrading connection',
        'Check for background downloads'
      ]
    );
  }

  return recommendations;
}; 
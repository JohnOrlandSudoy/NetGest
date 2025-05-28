const { VideoTrafficService, AudioTrafficService, VoiceTrafficService } = require('./trafficServices');

class TrafficAnalyzer {
  constructor(tsharkPath, interfaceId) {
    this.videoService = new VideoTrafficService(tsharkPath, interfaceId);
    this.audioService = new AudioTrafficService(tsharkPath, interfaceId);
    this.voiceService = new VoiceTrafficService(tsharkPath, interfaceId);
  }

  async analyzeAllTraffic(duration = 5) {
    try {
      // Analyze all traffic types in parallel
      const [videoResults, audioResults, voiceResults] = await Promise.all([
        this.videoService.analyzeVideoTraffic(duration),
        this.audioService.analyzeAudioTraffic(duration),
        this.voiceService.analyzeVoiceTraffic(duration)
      ]);

      // Calculate total traffic metrics
      const totalPackets = (videoResults?.packetCount || 0) + 
                          (audioResults?.packetCount || 0) + 
                          (voiceResults?.packetCount || 0);
      
      const totalBandwidth = (videoResults?.metrics?.bandwidth || 0) + 
                           (audioResults?.metrics?.bandwidth || 0) + 
                           (voiceResults?.metrics?.bandwidth || 0);

      // Return structured traffic data
      return {
        video: {
          packets: videoResults?.packetCount || 0,
          bytes: this.calculateBytes(videoResults?.metrics?.bandwidth || 0, duration),
          bitrate: videoResults?.metrics?.bandwidth || 0,
          quality: this.determineVideoQuality(videoResults?.metrics?.bandwidth || 0)
        },
        audio: {
          packets: audioResults?.packetCount || 0,
          bytes: this.calculateBytes(audioResults?.metrics?.bandwidth || 0, duration),
          bitrate: audioResults?.metrics?.bandwidth || 0,
          quality: this.determineAudioQuality(audioResults?.metrics?.bandwidth || 0)
        },
        voice: {
          packets: voiceResults?.packetCount || 0,
          bytes: this.calculateBytes(voiceResults?.metrics?.bandwidth || 0, duration),
          bitrate: voiceResults?.metrics?.bandwidth || 0,
          quality: this.determineVoiceQuality(voiceResults?.metrics?.bandwidth || 0)
        },
        total: {
          packets: totalPackets,
          bytes: this.calculateBytes(totalBandwidth, duration),
          bitrate: totalBandwidth
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing traffic:', error);
      throw new Error(`Traffic analysis failed: ${error.message}`);
    }
  }

  calculateBytes(bandwidth, duration) {
    // Convert Mbps to bytes for the given duration
    return (bandwidth * 1000000 * duration) / 8;
  }

  determineVideoQuality(bandwidth) {
    if (bandwidth === 0) return 'No Traffic';
    if (bandwidth < 1) return 'Low';
    if (bandwidth < 3) return 'SD';
    if (bandwidth < 5) return 'HD';
    return '4K';
  }

  determineAudioQuality(bandwidth) {
    if (bandwidth === 0) return 'No Traffic';
    if (bandwidth < 0.1) return 'Low';
    if (bandwidth < 0.3) return 'Normal';
    return 'High';
  }

  determineVoiceQuality(bandwidth) {
    if (bandwidth === 0) return 'No Traffic';
    if (bandwidth < 0.05) return 'Poor';
    if (bandwidth < 0.1) return 'Fair';
    return 'Good';
  }

  generateTrafficRecommendations(trafficData) {
    const recommendations = {
      video: this.analyzeVideoTraffic(trafficData.video),
      audio: this.analyzeAudioTraffic(trafficData.audio),
      voice: this.analyzeVoiceTraffic(trafficData.voice),
      overall: this.analyzeOverallTraffic(trafficData)
    };

    return recommendations;
  }

  analyzeVideoTraffic(videoData) {
    const recommendations = [];
    
    if (videoData.quality === 'Low' || videoData.quality === 'No Traffic') {
      recommendations.push({
        severity: 'high',
        message: 'Video quality is low or no traffic detected:',
        actions: [
          'Check network bandwidth allocation',
          'Verify video streaming service is active',
          'Ensure no background downloads are running',
          'Consider using a wired connection'
        ]
      });
    }

    if (videoData.bitrate > 5) {
      recommendations.push({
        severity: 'medium',
        message: 'High video bandwidth usage detected:',
        actions: [
          'Monitor for unauthorized video streaming',
          'Consider implementing bandwidth limits',
          'Check for multiple HD video streams'
        ]
      });
    }

    return recommendations;
  }

  analyzeAudioTraffic(audioData) {
    const recommendations = [];
    
    if (audioData.quality === 'Low' || audioData.quality === 'No Traffic') {
      recommendations.push({
        severity: 'high',
        message: 'Audio quality issues or no traffic detected:',
        actions: [
          'Check for network congestion',
          'Verify audio streaming service is active',
          'Ensure sufficient bandwidth for audio streams'
        ]
      });
    }

    return recommendations;
  }

  analyzeVoiceTraffic(voiceData) {
    const recommendations = [];
    
    if (voiceData.quality === 'Poor' || voiceData.quality === 'No Traffic') {
      recommendations.push({
        severity: 'high',
        message: 'Voice quality is poor or no traffic detected:',
        actions: [
          'Check for packet loss and jitter',
          'Verify VoIP service is active',
          'Consider using a dedicated voice VLAN',
          'Monitor for bandwidth competition'
        ]
      });
    }

    return recommendations;
  }

  analyzeOverallTraffic(trafficData) {
    const recommendations = [];
    const totalBandwidth = trafficData.total.bitrate;

    if (totalBandwidth === 0) {
      recommendations.push({
        severity: 'high',
        message: 'No network traffic detected:',
        actions: [
          'Verify network interface is active',
          'Check network connectivity',
          'Ensure monitoring services are running',
          'Verify TShark installation and permissions'
        ]
      });
    } else if (totalBandwidth > 50) {
      recommendations.push({
        severity: 'high',
        message: 'High overall network utilization:',
        actions: [
          'Implement traffic shaping',
          'Consider bandwidth upgrades',
          'Schedule non-critical traffic for off-peak hours',
          'Monitor for bandwidth-intensive applications'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = TrafficAnalyzer; 
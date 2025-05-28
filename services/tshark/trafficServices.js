const { exec } = require('child_process');
const path = require('path');

class BaseTrafficService {
  constructor(tsharkPath, interfaceId) {
    this.tsharkPath = tsharkPath;
    this.interfaceId = interfaceId;
  }

  async checkPermissions() {
    try {
      const response = await fetch('/api/tshark/check-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tsharkPath: this.tsharkPath,
          interfaceId: this.interfaceId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check TShark permissions');
      }

      const data = await response.json();
      console.log('TShark permissions check result:', data);
      return data.success;
    } catch (error) {
      console.error('Error checking TShark permissions:', error);
      return false;
    }
  }

  async executeCommand(command, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Executing command (attempt ${attempt}/${retries}):`, command);
        
        const response = await fetch('/api/tshark/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to execute TShark command');
        }

        return {
          output: data.output,
          isPartial: data.partial || false
        };
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === retries) {
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  async runTSharkCommand(filter, count = 10) {
    try {
      const command = `"${this.tsharkPath}" -i "${this.interfaceId}" -c ${count} -f "${filter}" -q`;
      const { output, isPartial } = await this.executeCommand(command);
      
      if (!output) {
        throw new Error('No output received from TShark command');
      }

      return {
        ...this.parseTSharkOutput(output),
        isPartial
      };
    } catch (error) {
      console.error('Error running TShark command:', error);
      throw error;
    }
  }

  parseTSharkOutput(output) {
    try {
      const packetMatch = output.match(/(\d+) packets captured/);
      const packetCount = packetMatch ? parseInt(packetMatch[1]) : 0;

      return {
        packets: packetCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error parsing TShark output:', error);
      return {
        packets: 0,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }
}

class VideoTrafficService extends BaseTrafficService {
  constructor(tsharkPath, interfaceId) {
    super(tsharkPath, interfaceId);
    this.filter = 'tcp port 443 and tcp.len > 1000';
  }

  async analyzeVideoTraffic() {
    try {
      const filter = 'tcp port 443';
      const result = await this.runTSharkCommand(filter);
      
      return {
        type: 'video',
        ...result,
        quality: this.determineQuality(result.packets)
      };
    } catch (error) {
      console.error('Error analyzing video traffic:', error);
      return {
        type: 'video',
        packets: 0,
        timestamp: new Date().toISOString(),
        quality: 'Unknown',
        error: error.message
      };
    }
  }

  determineQuality(packets) {
    if (packets === 0) return 'Unknown';
    if (packets < 5) return 'Low';
    if (packets < 20) return 'SD';
    return 'HD';
  }
}

class AudioTrafficService extends BaseTrafficService {
  constructor(tsharkPath, interfaceId) {
    super(tsharkPath, interfaceId);
    this.filter = 'tcp port 443 and tcp.len > 100 and tcp.len < 1000';
  }

  async analyzeAudioTraffic() {
    try {
      const filter = 'tcp port 443 and less 1000';
      const result = await this.runTSharkCommand(filter);
      
      return {
        type: 'audio',
        ...result,
        quality: this.determineQuality(result.packets)
      };
    } catch (error) {
      console.error('Error analyzing audio traffic:', error);
      return {
        type: 'audio',
        packets: 0,
        timestamp: new Date().toISOString(),
        quality: 'Unknown',
        error: error.message
      };
    }
  }

  determineQuality(packets) {
    if (packets === 0) return 'Unknown';
    if (packets < 3) return 'Low';
    if (packets < 10) return 'Normal';
    return 'High';
  }
}

class VoiceTrafficService extends BaseTrafficService {
  constructor(tsharkPath, interfaceId) {
    super(tsharkPath, interfaceId);
    this.filter = '(udp port 5060 or udp portrange 10000-20000) and udp.length > 50';
  }

  async analyzeVoiceTraffic() {
    try {
      const filter = 'udp';
      const result = await this.runTSharkCommand(filter);
      
      return {
        type: 'voice',
        ...result,
        quality: this.determineQuality(result.packets)
      };
    } catch (error) {
      console.error('Error analyzing voice traffic:', error);
      return {
        type: 'voice',
        packets: 0,
        timestamp: new Date().toISOString(),
        quality: 'Unknown',
        error: error.message
      };
    }
  }

  determineQuality(packets) {
    if (packets === 0) return 'Unknown';
    if (packets < 2) return 'Poor';
    if (packets < 5) return 'Fair';
    return 'Good';
  }
}

class TrafficAnalyzer {
  constructor(tsharkPath, interfaceId) {
    this.videoService = new VideoTrafficService(tsharkPath, interfaceId);
    this.audioService = new AudioTrafficService(tsharkPath, interfaceId);
    this.voiceService = new VoiceTrafficService(tsharkPath, interfaceId);
  }

  async analyzeAllTraffic(duration = 5) {
    try {
      console.log('Starting traffic analysis...');
      const [video, audio, voice] = await Promise.all([
        this.videoService.analyzeVideoTraffic(),
        this.audioService.analyzeAudioTraffic(),
        this.voiceService.analyzeVoiceTraffic()
      ]);

      const total = {
        packets: video.packets + audio.packets + voice.packets,
        bytes: video.bytes + audio.bytes + voice.bytes,
        bitrate: video.bitrate + audio.bitrate + voice.bitrate
      };

      return {
        video,
        audio,
        voice,
        total
      };
    } catch (error) {
      console.error('Error analyzing all traffic:', error);
      return {
        video: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic', details: [] },
        audio: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic', details: [] },
        voice: { packets: 0, bytes: 0, bitrate: 0, quality: 'No Traffic', details: [] },
        total: { packets: 0, bytes: 0, bitrate: 0 }
      };
    }
  }

  generateTrafficRecommendations(trafficData) {
    const recommendations = {
      video: [],
      audio: [],
      voice: []
    };

    // Video recommendations
    if (trafficData.video.bitrate > 5) {
      recommendations.video.push({
        severity: 'high',
        message: 'High video traffic detected',
        actions: [
          'Consider reducing video quality',
          'Check for unauthorized video streaming',
          'Implement QoS for video traffic'
        ]
      });
    }

    // Audio recommendations
    if (trafficData.audio.bitrate > 0.5) {
      recommendations.audio.push({
        severity: 'high',
        message: 'High audio traffic detected',
        actions: [
          'Check for multiple audio streams',
          'Implement audio compression',
          'Monitor audio quality'
        ]
      });
    }

    // Voice recommendations
    if (trafficData.voice.bitrate > 0.1) {
      recommendations.voice.push({
        severity: 'high',
        message: 'High voice traffic detected',
        actions: [
          'Check for multiple voice calls',
          'Implement voice compression',
          'Monitor voice quality'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = {
  TrafficAnalyzer,
  VideoTrafficService,
  AudioTrafficService,
  VoiceTrafficService
}; 
const { exec } = require('child_process');
const path = require('path');

class TSharkService {
  constructor(tsharkPath, interfaceId) {
    this.tsharkPath = tsharkPath || 'C:\\Program Files\\Wireshark\\tshark.exe';
    this.interfaceId = interfaceId || '\\Device\\NPF_{E8BF1646-750F-4476-9B15-3007F1F6711F}';
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        }
        const fullOutput = stderr ? stderr + '\n' + stdout : stdout;
        resolve(fullOutput);
      });
    });
  }

  async getInterfaces() {
    const command = `"${this.tsharkPath}" -D`;
    const output = await this.executeCommand(command);
    return this.parseInterfaces(output);
  }

  parseInterfaces(output) {
    const lines = output.split('\n');
    return lines
      .filter(line => line.trim())
      .map(line => {
        const match = line.match(/(\d+)\.\s+(.+?)\s+\((.+?)\)/);
        if (match) {
          return {
            index: parseInt(match[1]),
            name: match[2].trim(),
            description: match[3].trim()
          };
        }
        return null;
      })
      .filter(Boolean);
  }

  async captureTraffic(filter, duration = 5, packetCount = 100) {
    const command = `"${this.tsharkPath}" -i "${this.interfaceId}" -c ${packetCount} -a duration:${duration} -f "${filter}"`;
    return this.executeCommand(command);
  }

  parsePacketCount(output) {
    const match = output.match(/(\d+) packets captured/);
    return match ? parseInt(match[1]) : 0;
  }
}

module.exports = TSharkService; 
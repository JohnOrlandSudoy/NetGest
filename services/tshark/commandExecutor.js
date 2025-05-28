const { exec } = require('child_process');
const logger = require('./logger');

class TSharkCommandExecutor {
  constructor(tsharkPath) {
    this.tsharkPath = tsharkPath;
  }

  async execute(command) {
    return new Promise((resolve, reject) => {
      logger.debug('Executing TShark command', { command });
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          logger.error('Command execution failed', error);
          return reject(error);
        }
        
        const fullOutput = stdout + stderr;
        logger.debug('Command output received', { outputLength: fullOutput.length });
        resolve(fullOutput);
      });
    });
  }

  async checkTSharkInstallation() {
    try {
      await this.execute(`"${this.tsharkPath}" -v`);
      return true;
    } catch (error) {
      logger.error('TShark installation check failed', error);
      return false;
    }
  }

  async getInterfaces() {
    try {
      const output = await this.execute(`"${this.tsharkPath}" -D`);
      return this.parseInterfaces(output);
    } catch (error) {
      logger.error('Failed to get interfaces', error);
      throw error;
    }
  }

  parseInterfaces(output) {
    const interfaces = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+?)\s+\((.+)\)$/);
      if (match) {
        interfaces.push({
          id: match[1].trim(),
          name: match[2].trim()
        });
      }
    }
    
    logger.debug('Parsed interfaces', { count: interfaces.length });
    return interfaces;
  }
}

module.exports = TSharkCommandExecutor; 
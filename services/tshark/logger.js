const logger = {
  info: (message, data = {}) => {
    console.log(`[TShark INFO] ${message}`, data);
  },
  error: (message, error = null) => {
    console.error(`[TShark ERROR] ${message}`, error);
  },
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[TShark DEBUG] ${message}`, data);
    }
  },
  warn: (message, data = {}) => {
    console.warn(`[TShark WARN] ${message}`, data);
  }
};

module.exports = logger; 
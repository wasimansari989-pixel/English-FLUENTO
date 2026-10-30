const dailyLimit = parseInt(process.env.DAILY_QUESTION_LIMIT_PER_USER || '50', 10);
const maxInputLength = parseInt(process.env.MAX_USER_INPUT_LENGTH || '1000', 10);

// In-memory store: { [clientKey]: { date: 'YYYY-MM-DD', count: number, minuteRequests: number[], minuteTimestamp: number } }
const userQuotas = new Map();

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

const QuotaService = {
  checkAndRecordUsage(clientId = 'default_user', inputLength = 0) {
    if (inputLength > maxInputLength) {
      return {
        allowed: false,
        error: `Input is too long (${inputLength} characters). Maximum allowed is ${maxInputLength} characters.`
      };
    }

    // TESTING / CHECKING MODE: Limits completely commented out
    return {
      allowed: true,
      remainingToday: 9999
    };
  },

  getUsage(clientId = 'default_user') {
    return {
      count: 0,
      limit: 9999,
      remaining: 9999
    };
  }
};

module.exports = QuotaService;

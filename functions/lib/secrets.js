/* Authoritative secret validation */
const { ATHAR } = require('./schema');

const SECRETS = new Map([
  ['10_hidden-crack', { threadId: 10, secretId: 'hidden-crack', correct: 'herb-wrap', rewardAmount: ATHAR.secret, type: 'secret' }],
]);

function validateSecret({ threadId, secretId, optionId }) {
  const key = threadId + '_' + secretId;
  const s = SECRETS.get(key) || Array.from(SECRETS.values()).find(x => x.threadId === threadId && (x.secretId === secretId));
  if (!s) return { ok: false, reason: 'invalid_secret' };
  if (typeof optionId !== 'string') return { ok: false, reason: 'invalid_answer' };
  if (optionId.trim().toLowerCase() === String(s.correct).toLowerCase()) {
    return { ok: true, rewardAmount: s.rewardAmount, type: s.type, secretId: s.secretId, threadId: s.threadId };
  }
  return { ok: false, reason: 'wrong_answer' };
}

module.exports = {
  validateSecret,
};

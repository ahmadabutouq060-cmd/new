/* Authoritative challenge validation (minimal server-side view of the hero thread answers) */
const { ATHAR } = require('./schema');

const CHALLENGES = new Map([
  ['1_w1', { threadId: 10, waypointId: 1, challengeId: 't10_w1', type: 'challenge', answer: 'ibex' }],
  ['1_w2', { threadId: 10, waypointId: 2, challengeId: 't10_w2', type: 'observation', answer: 'boot-prints' }],
  ['1_w4', { threadId: 10, waypointId: 4, challengeId: 't10_w4', type: 'challenge', answer: 'red-thread' }],
]);

function getChallenge(threadId, waypointId, challengeId) {
  if (threadId == null || waypointId == null) return null;
  // Check by key patterns from our map
  for (const [, v] of CHALLENGES) {
    if (v.threadId === threadId && v.waypointId === waypointId) {
      // accept if challengeId matches or is null
      if (!challengeId) return v;
      if (v.challengeId === challengeId) return v;
      // try flexible match
      return v;
    }
  }
  // fallback: try keys
  const key = 1_w;
  const alt = CHALLENGES.get(key);
  if (alt) {
    if (alt.threadId !== threadId) return null;
    return alt;
  }
  return null;
}

function validateChallenge({ threadId, waypointId, challengeId, answer }) {
  const ch = getChallenge(threadId, waypointId, challengeId);
  if (!ch) return { ok: false, reason: 'invalid_challenge' };
  if (typeof answer !== 'string') return { ok: false, reason: 'invalid_answer' };
  if (answer.trim().toLowerCase() === String(ch.answer).toLowerCase()) {
    return {
      ok: true,
      rewardType: ch.type === 'observation' ? 'challenge' : 'challenge',
      rewardAmount: ATHAR.challenge,
    };
  }
  return { ok: false, reason: 'wrong_answer' };
}

module.exports = {
  validateChallenge,
};

// Shared trusted schema definitions (amounts derived from server data)
const ATHAR = {
  challenge: 150,
  clue: 100,
  chapter: 200,
  reveal: 500,
  secret: 250,
};

const REWARD_SOURCES = {
  challenge: 'challenge_answer',
  clue: 'clue_unlock',
  chapter: 'chapter_reached',
  reveal: 'thread_reveal',
  secret: 'secret_challenge',
};

function docSafe(value) {
  return String(value == null ? '' : value).replace(/[^A-Za-z0-9_-]/g, '_');
}

function rewardKey(threadId, kind, key) {
  return 't' + threadId + '_' + kind + '_' + docSafe(key);
}

module.exports = {
  ATHAR,
  REWARD_SOURCES,
  docSafe,
  rewardKey,
};

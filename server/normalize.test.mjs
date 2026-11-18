import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGames, teamKey, gamePhase, isValidDate } from './normalize.mjs';

test('팀 이름을 표준화한다', () => {
  assert.equal(teamKey('롯데 자이언츠'), '롯데');
  assert.equal(teamKey('KIA 타이거즈'), 'KIA');
  assert.equal(teamKey('lg'), 'LG');
  assert.equal(teamKey('NC 다이노스'), 'NC');
});
test('경기 상태를 분류한다', () => {
  assert.equal(gamePhase('경기종료'), 'finished');
  assert.equal(gamePhase('우천취소'), 'cancelled');
  assert.equal(gamePhase('7회말'), 'live');
  assert.equal(gamePhase('경기예정'), 'scheduled');
  assert.equal(gamePhase('FINISHED'), 'finished');
  assert.equal(gamePhase('IN_PROGRESS'), 'live');
  assert.equal(gamePhase('CANCELED'), 'cancelled');
});
test('점수 0과 미정 점수를 구분하고 홈 원정이 바뀌지 않는다', () => {
  const games = normalizeGames([{ homeTeam: '한화', awayTeam: '롯데', score: { home: 0, away: '' }, status: '경기예정', stadium: '대전', startTime: '18:30' }]);
  assert.equal(games[0].score.home, 0);
  assert.equal(games[0].score.away, null);
  assert.equal(games[0].homeKey, '한화');
  assert.equal(games[0].awayKey, '롯데');
});
test('날짜 형식과 실제 날짜를 검증한다', () => {
  assert.equal(isValidDate('2026-04-01'), true);
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-4-01'), false);
});

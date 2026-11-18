// kbo-game@0.0.2 의 응답을 브라우저에서 쓰기 쉬운 형식으로 표준화합니다.
export const TEAMS = [
  ['LG', ['lg', 'lg트윈스', '엘지', '엘지트윈스']],
  ['한화', ['한화', '한화이글스']],
  ['롯데', ['롯데', '롯데자이언츠']],
  ['KIA', ['kia', 'kia타이거즈', '기아', '기아타이거즈']],
  ['삼성', ['삼성', '삼성라이온즈']],
  ['SSG', ['ssg', 'ssg랜더스']],
  ['KT', ['kt', 'kt위즈', '케이티']],
  ['두산', ['두산', '두산베어스']],
  ['NC', ['nc', 'nc다이노스', '엔씨']],
  ['키움', ['키움', '키움히어로즈']],
];

function clean(value) {
  return String(value ?? '').toLowerCase().replace(/[\s\-_()]/g, '');
}
export function teamKey(name) {
  const cleaned = clean(name);
  for (const [key, variants] of TEAMS) {
    if (clean(key) === cleaned || variants.includes(cleaned)) return key;
  }
  return String(name ?? '').trim() || '미정';
}

function readScore(value) {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function gamePhase(status) {
  const text = String(status ?? '').toLowerCase();
  if (/취소|우천|노게임|노 게임|중지|미개최|canceled|cancelled/.test(text)) return 'cancelled';
  if (/종료|경기끝|final|완료|finished/.test(text)) return 'finished';
  if (/진행|초|말|inning|live|중단|in_progress/.test(text)) return 'live';
  if (/예정|시작전|대기|scheduled/.test(text)) return 'scheduled';
  return 'unknown';
}

export function normalizeGames(raw) {
  if (!Array.isArray(raw)) throw new Error('경기 데이터 형식이 예상과 다릅니다.');
  return raw.map((game, index) => {
    const homeTeam = String(game?.homeTeam ?? '미정');
    const awayTeam = String(game?.awayTeam ?? '미정');
    const status = String(game?.status ?? '상태 미확인');
    const currentInning = game?.currentInning ? String(game.currentInning) : null;
    return {
      id: String(game?.id || `${index}-${teamKey(awayTeam)}-${teamKey(homeTeam)}`),
      kboId: game?.id ? String(game.id) : null,
      pitchers: {
        away: game?.awayPitcher || null,
        home: game?.homePitcher || null,
        win: game?.winPitcher || null,
        loss: game?.losePitcher || null,
        save: game?.savePitcher || null,
      },
      homeTeam,
      awayTeam,
      homeKey: teamKey(homeTeam),
      awayKey: teamKey(awayTeam),
      stadium: String(game?.stadium ?? ''),
      startTime: String(game?.startTime ?? ''),
      status,
      phase: gamePhase(status),
      currentInning,
      score: {
        home: readScore(game?.score?.home),
        away: readScore(game?.score?.away),
      },
    };
  });
}

export function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

const KBO = 'https://www.koreabaseball.com';

async function requestKbo(endpoint, params) {
  const response = await fetch(KBO + endpoint, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Origin: KBO,
      Referer: KBO + '/Schedule/GameCenter/Main.aspx',
    },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`KBO HTTP ${response.status}`);
  return response.json();
}

function readRows(table) {
  if (!table) return [];
  return JSON.parse(table).rows?.map(({ row }) =>
    row.map(({ Text }) => String(Text ?? '').replace(/&nbsp;/g, ' ').trim())) ?? [];
}

export async function loadRecords(gameId) {
  const gameList = await requestKbo('/ws/Main.asmx/GetKboGameList', {
    leId: '1',
    srId: '0,1,3,4,5,6,7,8,9',
    date: gameId.slice(0, 8),
  });
  if (!Array.isArray(gameList.game)) throw new Error('KBO 경기 목록 형식이 예상과 다릅니다.');
  const game = gameList.game.find((entry) => entry.G_ID === gameId);
  if (!game || !['2', '3'].includes(String(game.GAME_STATE_SC))) return { teams: [] };

  const data = await requestKbo('/ws/Schedule.asmx/GetBoxScoreScroll', {
    leId: '1',
    srId: String(game.SR_ID),
    seasonId: String(game.SEASON_ID),
    gameId,
  });
  if (String(data.code) !== '100') throw new Error('KBO 박스스코어를 조회하지 못했습니다.');

  const teams = [game.AWAY_NM, game.HOME_NM].map((name, index) => {
    const hitters = data.arrHitter?.[index];
    const players = readRows(hitters?.table1);
    const totals = readRows(hitters?.table3);
    if (players.length !== totals.length) throw new Error('KBO 타자 기록 행 수가 일치하지 않습니다.');
    return {
      name,
      batting: players.map((row, playerIndex) => [...row, ...totals[playerIndex]]),
      pitching: readRows(data.arrPitcher?.[index]?.table),
    };
  });
  return { teams };
}

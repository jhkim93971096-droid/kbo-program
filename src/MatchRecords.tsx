import { Fragment, useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

type TeamRecords = { name: string; batting: string[][]; pitching: string[][] };
const BATTING = ['순번', '포지션', '선수', '타수', '안타', '타점', '득점', '타율'];
const PITCHING = ['선수', '등판', '결과', '승', '패', '세', '이닝', '타자', '투구수', '타수', '피안타', '피홈런', '4사구', '삼진', '실점', '자책', '평균자책점'];

function RecordsTable({ label, columns, rows }: {
  label: string;
  columns: string[];
  rows: string[][];
}) {
  if (!rows.length) return null;
  return <section>
    <h4>{label}</h4>
    <div className="record-scroll" role="region" aria-label={label} tabIndex={0}>
      <table aria-label={label}>
        <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>
          {columns.map((column, position) => <td key={column}>{row[position] || '–'}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
  </section>;
}

export function MatchRecords({ date, gameId, phase, pitchers }: {
  date: string;
  gameId?: string | null;
  phase: string;
  pitchers: [string, string | null | undefined][];
}) {
  const canLoad = Boolean(gameId) && (phase === 'finished' || phase === 'live');
  const [teams, setTeams] = useState<TeamRecords[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!canLoad || !gameId) return;
    const controller = new AbortController();
    fetch(`/api/games/records?gameId=${encodeURIComponent(gameId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('기록 조회 실패');
        const data = await response.json();
        setTeams(data.teams);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt, canLoad, gameId]);

  const namedPitchers = pitchers.filter(([, name]) => Boolean(name));
  const hasRecords = teams?.some(({ batting, pitching }) => batting.length || pitching.length);
  const official = new URL('https://www.koreabaseball.com/Schedule/GameCenter/Main.aspx');
  official.searchParams.set('gameDate', date.replace(/-/g, ''));
  if (gameId) official.searchParams.set('gameId', gameId);

  return <div className="match-records">
    {namedPitchers.length > 0 && <dl>{namedPitchers.map(([label, name]) =>
      <Fragment key={label}><dt>{label}</dt><dd>{name}</dd></Fragment>)}</dl>}
    {failed ? <div>
      <p role="status">선수 기록을 불러오지 못했습니다.</p>
      <button type="button" className="today-button" onClick={() => { setFailed(false); setAttempt((value) => value + 1); }}>다시 시도</button>
    </div> : canLoad && teams === null ? <p role="status">선수 기록을 불러오는 중…</p>
      : !hasRecords && <p>{phase === 'scheduled' ? '타자·투수 기록은 경기 데이터가 공개되면 표시됩니다.' : '공개된 타자·투수 기록이 없습니다.'}</p>}
    {teams?.map(({ name, batting, pitching }, index) => <Fragment key={index}>
      <RecordsTable label={`${name} 타자 기록`} columns={BATTING} rows={batting}/>
      <RecordsTable label={`${name} 투수 기록`} columns={PITCHING} rows={pitching}/>
    </Fragment>)}
    <p><a href={official.href} target="_blank" rel="noreferrer">KBO 공식 게임센터 <ExternalLink size={14}/></a></p>
  </div>;
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { DatePicker } from './DatePicker';
import { MatchRecords } from './MatchRecords';
import { SeasonForecast } from './SeasonForecast';
import { Activity, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Clock3, ExternalLink, Info, MapPin, Radio, RefreshCw, RotateCcw, Trophy } from 'lucide-react';

type Phase = 'live' | 'finished' | 'scheduled' | 'cancelled' | 'unknown';
type TeamKey = 'LG' | '한화' | '롯데' | 'KIA' | '삼성' | 'SSG' | 'KT' | '두산' | 'NC' | '키움';
type Game = {
  id: string;
  kboId?: string | null;
  pitchers?: { away: string | null; home: string | null; win: string | null; loss: string | null; save: string | null };
  homeTeam: string;
  awayTeam: string;
  homeKey: string;
  awayKey: string;
  stadium: string;
  startTime: string;
  status: string;
  phase: Phase;
  currentInning: string | null;
  score: { home: number | null; away: number | null };
};
type ApiResponse = { date: string; games: Game[]; count: number; updatedAt: string; source: string };

const TEAMS: { key: TeamKey; color: string; label: string }[] = [
  { key: 'LG', color: '#c62e43', label: 'LG' },
  { key: '한화', color: '#ef7834', label: '한화' },
  { key: '롯데', color: '#d44356', label: '롯데' },
  { key: 'KIA', color: '#e54a56', label: 'KIA' },
  { key: '삼성', color: '#3283e7', label: '삼성' },
  { key: 'SSG', color: '#ed5265', label: 'SSG' },
  { key: 'KT', color: '#7f8b9b', label: 'KT' },
  { key: '두산', color: '#2f78cd', label: '두산' },
  { key: 'NC', color: '#4d9bc9', label: 'NC' },
  { key: '키움', color: '#be4c69', label: '키움' },
];
const TEAM_COLORS: Record<string, string> = Object.fromEntries(TEAMS.map(({ key, color }) => [key, color]));

function koreaToday(): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function shiftDate(date: string, day: number): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + day);
  return parsed.toISOString().slice(0, 10);
}
function humanDate(date: string): string {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T12:00:00+09:00`));
}
function statusLabel(game: Game): string {
  if (game.phase === 'cancelled') return /^cancell?ed$/i.test(game.status) ? '경기 취소' : game.status;
  if (game.phase === 'finished') return '경기 종료';
  if (game.phase === 'live') {
    const inning = game.currentInning;
    return inning && /^\d+$/.test(inning) ? inning + '회' : inning || '진행 중';
  }
  if (game.phase === 'scheduled') return '경기 예정';
  return game.status || '상태 확인 중';
}
function Score({ value }: { value: number | null }) {
  return <span className={value === null ? 'score-value score-empty' : 'score-value'}>{value === null ? '–' : value}</span>;
}
function Team({ name, teamKey }: { name: string; teamKey: string }) {
  return <span className="team">
    <span className="team-emblem" style={{ '--team-color': TEAM_COLORS[teamKey] ?? '#6d88ac' } as CSSProperties}>{teamKey.slice(0, 2)}</span>
    <span className="team-name">{teamKey === '미정' ? name : teamKey}</span>
  </span>;
}
function MatchCard({ game, date }: { game: Game; date: string }) {
  const hasScores = game.score.away !== null || game.score.home !== null;
  const awayWon = game.phase === 'finished' && game.score.away !== null && game.score.home !== null && game.score.away > game.score.home;
  const homeWon = game.phase === 'finished' && game.score.away !== null && game.score.home !== null && game.score.home > game.score.away;
  const [expanded, setExpanded] = useState(false);
  return <article className="match-card">
    <button type="button" className="match-toggle" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
    <span className="match-topline">
      <span className="stadium"><MapPin size={14}/>{game.stadium || '구장 미확인'}</span>
      <span className={`game-status status-${game.phase}`}>{game.phase === 'live' && <span className="live-dot"/>}{statusLabel(game)}</span>
    </span>
    <span className="match-scores">
      <span className={awayWon ? 'side winner' : 'side'}><Team name={game.awayTeam} teamKey={game.awayKey}/><Score value={game.score.away}/></span>
      <span className="versus"><span>VS</span><small>{hasScores ? '원정 · 홈' : 'AWAY · HOME'}</small></span>
      <span className={homeWon ? 'side winner' : 'side'}><Score value={game.score.home}/><Team name={game.homeTeam} teamKey={game.homeKey}/></span>
    </span>
    <span className="match-footer"><span><Clock3 size={13}/>{game.startTime || '시각 미정'}</span><span>{expanded ? '선수 기록 닫기' : '선수 기록 보기'} <ChevronRight size={14}/></span></span>
    </button>
    {expanded && <MatchRecords date={date} gameId={game.kboId} phase={game.phase} pitchers={[
      [`${game.awayTeam} 선발`, game.pitchers?.away],
      [`${game.homeTeam} 선발`, game.pitchers?.home],
      ['승리 투수', game.pitchers?.win],
      ['패전 투수', game.pitchers?.loss],
      ['세이브', game.pitchers?.save],
    ]}/>}
  </article>;
}
function App() {
  const [date, setDate] = useState(koreaToday);
  const [selectedTeam, setSelectedTeam] = useState('전체');
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((current) => current + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPayload(null);
    const refreshQuery = refreshToken > 0 ? '&refresh=1' : '';
    fetch(`/api/games?date=${encodeURIComponent(date)}${refreshQuery}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '경기 데이터를 가져올 수 없습니다.');
        return result as ApiResponse;
      })
      .then(setPayload)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, refreshToken]);

  const games = payload?.games ?? [];
  const filteredGames = useMemo(() => selectedTeam === '전체' ? games : games.filter((game) => game.awayKey === selectedTeam || game.homeKey === selectedTeam), [games, selectedTeam]);
  const totals = {
    all: games.length,
    finished: games.filter((game) => game.phase === 'finished').length,
    live: games.filter((game) => game.phase === 'live').length,
    upcoming: games.filter((game) => game.phase === 'scheduled').length,
  };
  const nowIsToday = date === koreaToday();
  const updated = payload?.updatedAt ? new Date(payload.updatedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' }) : null;

  return <div className="site">
    <header className="header page-width">
      <div className="brand"><div className="brand-mark"><span className="baseball">⚾</span></div><div className="brand-copy"><strong>KBO <em>MATCHDAY</em></strong><span>한국 프로야구 스코어보드</span></div></div>
      <div className="header-right"><span className="season-chip"><span className="chip-dot"/> KBO LEAGUE</span><span className="header-season">2026 SEASON</span></div>
    </header>

    <main className="page-width">
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-content"><span className="eyebrow"><span className="line"/> YOUR DAILY BASEBALL UPDATE</span><h1 id="page-title">오늘의 야구,<br/><span>한눈에 확인하세요.</span></h1><p>날짜를 선택하고 원하는 팀의 경기 일정과 결과를 빠르게 확인하세요.</p></div>
        <div className="hero-graphic" aria-hidden="true"><div className="ball-orbit orbit-one"/><div className="ball-orbit orbit-two"/><div className="hero-ball"><span>⚾</span></div><div className="hero-score">PLAY BALL <strong>!</strong></div></div>
      </section>

      <nav className="forecast-nav" aria-label="시즌 예측"><a className="filter-pill" href="#season-forecast">2027 순위 예측 보기 <ArrowRight size={15}/></a></nav>

      <section className="toolbar" aria-label="경기 날짜 선택">
        <div className="date-title"><span className="section-small">GAME SCHEDULE</span><h2>경기 일정 <span>& 결과</span></h2></div>
        <div className="date-controls"><button className="date-nav" aria-label="이전 날짜" onClick={() => setDate((value) => shiftDate(value, -1))}><ChevronLeft size={19}/></button><DatePicker date={date} label={humanDate(date)} onChange={setDate}/><button className="date-nav" aria-label="다음 날짜" onClick={() => setDate((value) => shiftDate(value, 1))}><ChevronRight size={19}/></button><button className="today-button" onClick={() => setDate(koreaToday())} disabled={nowIsToday}>오늘</button><button className="refresh-button" onClick={refresh} disabled={loading} aria-label="경기 다시 불러오기" title="새로고침"><RefreshCw size={18} className={loading ? 'spin' : ''}/></button></div>
      </section>

      <section className="stats" aria-label="경기 수 요약">
        <div className="stat"><div className="stat-icon all"><Trophy size={18}/></div><div><span>전체 경기</span><strong>{loading ? '—' : totals.all}<small>경기</small></strong></div></div>
        <div className="stat"><div className="stat-icon finished"><Activity size={18}/></div><div><span>종료</span><strong>{loading ? '—' : totals.finished}<small>경기</small></strong></div></div>
        <div className="stat"><div className="stat-icon live"><Radio size={18}/></div><div><span>진행 중</span><strong>{loading ? '—' : totals.live}<small>경기</small></strong></div></div>
        <div className="stat"><div className="stat-icon upcoming"><Clock3 size={18}/></div><div><span>예정</span><strong>{loading ? '—' : totals.upcoming}<small>경기</small></strong></div></div>
      </section>

      <section className="filters" aria-labelledby="filters-title"><div className="filters-head"><div><span className="section-small">TEAM FILTER</span><h3 id="filters-title">응원하는 팀을 선택하세요</h3></div><span className="filters-help">전체 10개 구단</span></div><div className="team-filters"><button className={selectedTeam === '전체' ? 'filter-pill active' : 'filter-pill'} onClick={() => setSelectedTeam('전체')}>전체</button>{TEAMS.map((team) => <button key={team.key} className={selectedTeam === team.key ? 'filter-pill active' : 'filter-pill'} onClick={() => setSelectedTeam(team.key)}><span className="filter-dot" style={{ backgroundColor: team.color }}/>{team.label}</button>)}</div></section>

      <section className="results" aria-label="경기 결과"><div className="result-head"><div><span className="section-small">MATCH RESULTS</span><h3>{selectedTeam === '전체' ? '전체 경기' : `${selectedTeam} 경기`} <span className="game-count">{loading ? '…' : filteredGames.length}</span></h3></div><div className="update-label">{updated ? `마지막 조회 ${updated} · KST` : '한국 표준시(KST) 기준'}</div></div>
      {loading ? <div className="message-area" role="status"><div className="spinner"/><h4>경기 정보를 불러오는 중입니다</h4><p>선택한 날짜의 스코어를 조회하고 있어요.</p></div>
      : error ? <div className="message-area" role="alert"><div className="message-icon error"><CircleAlert size={29}/></div><h4>경기를 불러오지 못했어요</h4><p>{error}</p><button className="retry" onClick={refresh}><RotateCcw size={16}/> 다시 시도</button></div>
      : filteredGames.length === 0 ? <div className="message-area"><div className="message-icon"><CalendarDays size={29}/></div><h4>{games.length === 0 ? '이 날짜에는 등록된 경기가 없어요' : `${selectedTeam} 경기 일정이 없어요`}</h4><p>{games.length === 0 ? '비시즌이나 휴식일일 수 있습니다. 다른 날짜를 선택해 보세요.' : '전체 경기를 보거나 다른 팀을 선택해 보세요.'}</p><button className="retry" onClick={() => { setDate(koreaToday()); setSelectedTeam('전체'); }}>오늘의 전체 경기 보기 <ArrowRight size={16}/></button></div>
      : <div className="matches-grid">{filteredGames.map((game) => <MatchCard game={game} date={date} key={`${date}-${game.id}`}/>)}</div>}
      </section>

      <SeasonForecast/>
      <div className="notice"><Info size={17}/><span>경기 정보는 외부 <code>kbo-game</code> 패키지 기반입니다. 실제 경기 진행 상황과 반영 시점에 차이가 있을 수 있습니다.</span></div>
    </main>
    <footer className="footer page-width"><div className="footer-logo">⚾ <b>KBO MATCHDAY</b> <span>· 개인 프로젝트</span></div><a href="https://github.com/NomaDamas/k-skill/blob/main/docs/features/kbo-results.md" target="_blank" rel="noopener noreferrer">기능 가이드 <ExternalLink size={14}/></a></footer>
  </div>;
}

export default App;

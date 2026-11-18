import { useState } from 'react';

const KBO = 'https://eng.koreabaseball.com/Standings/TeamStandings.aspx';
const FUTURES = 'https://www.koreabaseball.com/Futures/TeamRank/';
const WAR = 'https://hardhit.ai/teams/leaderboards';
const LOTTE = '롯데 자이언츠';

// 2026 정규시즌 승·패·득점·실점·ERA·타율, HARDHIT 팀 WAR, 퓨처스 승률.
const RECORDS = ([
  ['KT', 90, 49, 825, 649, 4.14, .286, 41.3, .469],
  ['삼성', 83, 58, 806, 669, 4.31, .273, 36.9, .408],
  ['KIA', 79, 63, 769, 664, 4.27, .271, 30.9, .439],
  ['LG', 78, 65, 723, 726, 4.81, .264, 28.4, .495],
  ['두산', 73, 66, 688, 630, 3.86, .267, 31.2, .433],
  ['SSG', 65, 74, 706, 797, 5.16, .259, 20.2, .406],
  [LOTTE, 64, 77, 679, 742, 4.72, .272, 25.3, .581],
  ['NC', 64, 78, 719, 772, 4.79, .270, 20.4, .569],
  ['한화', 57, 83, 821, 835, 5.26, .273, 27.7, .545],
  ['키움', 50, 90, 565, 817, 5.30, .244, 16.2, .422],
] as const).map(([team, wins, losses, runs, allowed, era, avg, war, futures]) => ({
  team, wins, losses, runs, allowed, era, avg, war, futures,
}));

type Record2026 = {
  team: string; wins: number; losses: number; runs: number; allowed: number;
  era: number; avg: number; war: number; futures: number;
};

type Forecast = {
  id: string;
  label: string;
  lotteRank: number;
  metric: string;
  description: string;
  score: (record: Record2026) => number;
  ascending?: boolean;
  digits: number;
  sources: [string, string][];
};

const FORECASTS: Forecast[] = [
  {
    id: 'prospects', label: '유망주 기반', lotteRank: 2, metric: '퓨처스 승률',
    description: '2군 전력의 참고 지표로 2026 퓨처스리그 승률을 사용합니다.',
    score: (team) => team.futures, digits: 3,
    sources: [['KBO 북부리그', FUTURES + 'North.aspx'], ['KBO 남부리그', FUTURES + 'South.aspx']],
  },
  {
    id: 'war', label: 'WAR 기반', lotteRank: 5, metric: '팀 WAR',
    description: '2026 팀 WAR(대체 선수 대비 승리 기여도)를 사용합니다.',
    score: (team) => team.war, digits: 1, sources: [['HARDHIT 팀 WAR', WAR]],
  },
  {
    id: 'pitching', label: '투수진 기반', lotteRank: 2, metric: '팀 평균자책점',
    description: '2026 팀 평균자책점이 낮을수록 높게 평가합니다.',
    score: (team) => team.era, ascending: true, digits: 2, sources: [['KBO 팀 성적', KBO]],
  },
  {
    id: 'batting', label: '타자진 기반', lotteRank: 4, metric: '팀 타율',
    description: '2026 팀 타율을 기준으로 정렬하며 표시 타율이 같으면 득점으로 순위를 정합니다.',
    score: (team) => team.avg, digits: 3, sources: [['KBO 팀 성적', KBO]],
  },
  {
    id: 'overall', label: '종합 기반', lotteRank: 3, metric: '종합 점수',
    description: '2026 승률 60%와 득점·실점으로 계산한 기대승률 40%를 반영합니다.',
    score: ({ wins, losses, runs, allowed }) =>
      100 * (0.6 * wins / (wins + losses) + 0.4 * runs ** 2 / (runs ** 2 + allowed ** 2)),
    digits: 1, sources: [['KBO 팀 성적', KBO]],
  },
];

function ForecastTable({ forecast }: { forecast: Forecast }) {
  const lotte = RECORDS.find(({ team }) => team === LOTTE)!;
  const teams = RECORDS.filter(({ team }) => team !== LOTTE).sort((first, second) => {
    const difference = forecast.score(first) - forecast.score(second);
    return (forecast.ascending ? difference : -difference) || second.runs - first.runs;
  });
  teams.splice(forecast.lotteRank - 1, 0, lotte);

  return <section className="forecast-panel" aria-labelledby={forecast.id + '-title'}>
    <h3 id={forecast.id + '-title'}>{forecast.label}</h3>
    <p>{forecast.description}</p>
    <div className="record-scroll" role="region" aria-label={forecast.label + ' 순위표'} tabIndex={0}>
      <table>
        <thead><tr><th scope="col">예상 순위</th><th scope="col">구단</th><th scope="col">{forecast.metric}</th></tr></thead>
        <tbody>{teams.map((record, index) => <tr key={record.team} className={record.team === LOTTE ? 'forecast-lotte' : undefined}>
          <td>{index + 1}위</td><th scope="row">{record.team}</th><td>{forecast.score(record).toFixed(forecast.digits)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="forecast-sources">{forecast.sources.map(([label, href]) =>
      <a key={href} href={href} target="_blank" rel="noreferrer">{label}</a>)}</div>
  </section>;
}

export function SeasonForecast() {
  const [selected, setSelected] = useState(['overall']);

  return <section id="season-forecast" className="filters forecast" aria-labelledby="forecast-title">
    <h2 id="forecast-title">2027 KBO 정규시즌 순위 예측</h2>
    <p>2026년 기록을 참고한 시나리오입니다. 롯데의 순위는 기준별로 지정되어 있으며, 이적시장 변동은 반영하지 않습니다.</p>
    <fieldset className="forecast-options">
      <legend>예측 기준 선택</legend>
      {FORECASTS.map(({ id, label }) => <label key={id} className="forecast-mode">
        <input type="checkbox" checked={selected.includes(id)} onChange={(event) => {
          const checked = event.currentTarget.checked;
          setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id));
        }}/>
        {label}
      </label>)}
    </fieldset>
    <div className="forecast-panels">
      {FORECASTS.filter(({ id }) => selected.includes(id)).map((forecast) => <ForecastTable key={forecast.id} forecast={forecast}/>)}
    </div>
  </section>;
}

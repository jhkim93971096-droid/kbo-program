import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeGames, isValidDate } from './normalize.mjs';
import { loadRecords } from './records.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const cache = new Map();
let getGamePromise;

async function loadGetGame() {
  if (!getGamePromise) {
    getGamePromise = import('kbo-game').then((module) => {
      if (typeof module.getGame !== 'function') throw new Error('kbo-game 패키지에서 getGame 함수를 찾지 못했습니다.');
      return module.getGame;
    }).catch((error) => { getGamePromise = undefined; throw error; });
  }
  return getGamePromise;
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
function kstToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
};

async function serveStatic(res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const desired = decoded === '/' ? '/index.html' : decoded;
  const resolved = path.resolve(DIST, `.${desired}`);
  if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) return json(res, 403, { error: '접근할 수 없는 경로입니다.' });
  let actual = resolved;
  try {
    if (!(await stat(actual)).isFile()) throw new Error('Not a file');
  } catch {
    // SPA 진입점은 index.html. 정적 파일은 404를 반환합니다.
    if (path.extname(desired)) return json(res, 404, { error: '파일을 찾을 수 없습니다.' });
    actual = path.join(DIST, 'index.html');
  }
  try {
    const content = await readFile(actual);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(actual)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch {
    json(res, 404, { error: '프런트엔드 빌드가 없습니다. 개발: npm run dev / 배포: npm run build && npm start' });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'kbo-matchday' });
    if (url.pathname === '/api/games/records') {
      if (req.method !== 'GET') return json(res, 405, { error: 'GET 요청만 허용합니다.' });
      const gameId = url.searchParams.get('gameId') || '';
      if (!/^\d{8}[A-Z]{4}\d{1,2}$/.test(gameId)) return json(res, 400, { error: '올바른 KBO 경기 번호를 입력해 주세요.' });
      try {
        return json(res, 200, await loadRecords(gameId));
      } catch (error) {
        console.error('[KBO 박스스코어]', error);
        return json(res, 502, { error: '선수 기록을 가져오지 못했습니다.' });
      }
    }
    if (url.pathname === '/api/games') {
      if (req.method !== 'GET') return json(res, 405, { error: 'GET 요청만 허용합니다.' });
      const date = url.searchParams.get('date') || '';
      if (!isValidDate(date)) return json(res, 400, { error: '날짜는 YYYY-MM-DD 형식이어야 합니다.' });
      const now = Date.now();
      const validCache = cache.get(date);
      if (url.searchParams.get('refresh') !== '1' && validCache && now < validCache.expiry) return json(res, 200, validCache.data);
      try {
        const getGame = await loadGetGame();
        // 주의: kbo-game@0.0.2 는 문자열이 아니라 Date 객체를 요구합니다.
        const raw = await getGame(new Date(`${date}T12:00:00`));
        const games = normalizeGames(raw ?? []);
        const data = { date, games, count: games.length, updatedAt: new Date().toISOString(), source: 'kbo-game@0.0.2' };
        // 지난 날짜는 30분, 오늘 및 미래는 45초 캐싱합니다.
        cache.set(date, { data, expiry: now + (date < kstToday() ? 30 * 60_000 : 45_000) });
        if (cache.size > 100) cache.delete(cache.keys().next().value);
        return json(res, 200, data);
      } catch (error) {
        console.error('[KBO API]', error);
        return json(res, 502, { error: 'KBO 경기 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.', detail: error instanceof Error ? error.message : String(error) });
      }
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'GET 요청만 허용합니다.' });
    return await serveStatic(res, url.pathname);
  } catch (error) {
    console.error('[server]', error);
    if (!res.headersSent) json(res, 500, { error: '서버 처리 중 오류가 발생했습니다.' });
  }
});
server.listen(PORT, HOST, () => console.log(`
⚾ KBO API: http://${HOST}:${PORT}
`));

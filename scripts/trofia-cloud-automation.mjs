import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const REPO = process.env.GITHUB_REPOSITORY || 'magnoClovis/nutrition-tracker';
const GH_TOKEN = process.env.GITHUB_TOKEN;
const RECIPIENT = process.env.REPORT_RECIPIENT || 'cmagno.dev@gmail.com';
const SENDER = process.env.GMAIL_SENDER || 'clovis.automatik@gmail.com';
const ZONE = 'Europe/Madrid';
const mode = process.argv[2];

if (!GH_TOKEN) throw new Error('GITHUB_TOKEN ausente.');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const minutes = (ms) => Math.max(0, Math.ceil(ms / 60000));
const pct = (value, base) => base ? `${(value / base * 100).toFixed(1).replace('.', ',')}%` : 'não determinado';
const money = (value) => `US$ ${value.toFixed(2).replace('.', ',')}`;

function zonedParts(date) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function zonedToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  const wanted = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = wanted;
  for (let i = 0; i < 3; i += 1) {
    const p = zonedParts(new Date(candidate));
    const represented = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    candidate += wanted - represented;
  }
  return new Date(candidate);
}

function localDate(date = new Date()) {
  const p = zonedParts(date);
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, weekday: p.weekday };
}

function addLocalDays(parts, amount) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function monthBounds(year, month, end = new Date()) {
  const start = zonedToUtc(year, month, 1);
  const next = month === 12 ? zonedToUtc(year + 1, 1, 1) : zonedToUtc(year, month + 1, 1);
  return { start, end: end < next ? end : new Date(next.getTime() - 1), next };
}

const ddmm = (date) => {
  const p = zonedParts(date);
  return `${p.day}/${p.month}`;
};
const localStamp = (date) => new Intl.DateTimeFormat('pt-BR', { timeZone: ZONE, dateStyle: 'short', timeStyle: 'short' }).format(date);

async function github(endpoint) {
  const response = await fetch(`https://api.github.com/repos/${REPO}${endpoint}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${endpoint} - ${await response.text()}`);
  return response.json();
}

async function paged(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const output = [];
  for (let page = 1; ; page += 1) {
    const data = await github(`${endpoint}${separator}per_page=100&page=${page}`);
    const items = Array.isArray(data) ? data : data.workflow_runs || data.jobs || [];
    output.push(...items);
    if (items.length < 100) return output;
  }
}

async function mapLimit(items, limit, worker) {
  const result = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      result[index] = await worker(items[index], index);
    }
  }));
  return result;
}

function classifyWorkflow(name) {
  if (/\bCI\b|Playwright|smoke|test/i.test(name)) return 'pesado';
  if (/Documentation|preflight|sanity|Pages|deploy|Trofia/i.test(name)) return 'leve';
  return 'não determinado';
}

async function actionsBetween(start, end) {
  const created = `${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`;
  const runs = (await paged(`/actions/runs?created=${created}`)).filter((run) => {
    const at = new Date(run.created_at);
    return at >= start && at <= end;
  });
  const rows = await mapLimit(runs, 8, async (run) => {
    const jobs = await paged(`/actions/runs/${run.id}/jobs?filter=all`);
    let total = 0;
    let determined = 0;
    for (const job of jobs) {
      if (!job.started_at || !job.completed_at) continue;
      total += minutes(new Date(job.completed_at) - new Date(job.started_at));
      determined += 1;
    }
    return { workflow: run.name, className: classifyWorkflow(run.name), minutes: total, jobs: determined };
  });
  const summary = { runs: runs.length, jobs: 0, leve: 0, pesado: 0, indeterminado: 0, workflows: {} };
  for (const row of rows) {
    summary.jobs += row.jobs;
    const key = row.className === 'não determinado' ? 'indeterminado' : row.className;
    summary[key] += row.minutes;
    summary.workflows[row.workflow] ||= { runs: 0, jobs: 0, minutes: 0, className: row.className };
    summary.workflows[row.workflow].runs += 1;
    summary.workflows[row.workflow].jobs += row.jobs;
    summary.workflows[row.workflow].minutes += row.minutes;
  }
  summary.total = summary.leve + summary.pesado + summary.indeterminado;
  return summary;
}

async function mergedPrsBetween(start, end) {
  const pulls = await paged('/pulls?state=closed&sort=updated&direction=desc');
  return pulls.filter((pr) => pr.merged_at && new Date(pr.merged_at) >= start && new Date(pr.merged_at) <= end);
}

async function commitsBetween(start, end) {
  return paged(`/commits?sha=main&since=${encodeURIComponent(start.toISOString())}&until=${encodeURIComponent(end.toISOString())}`);
}

async function billingRules() {
  const [billing, pricing] = await Promise.all([
    fetch('https://docs.github.com/en/billing/concepts/product-billing/github-actions').then((r) => r.text()),
    fetch('https://docs.github.com/en/billing/reference/actions-runner-pricing').then((r) => r.text()),
  ]);
  const text = `${billing}\n${pricing}`.replace(/<[^>]+>/g, ' ');
  const confirmed = /GitHub Free[\s\S]{0,300}2,000/i.test(text) && /GitHub Pro[\s\S]{0,300}3,000/i.test(text) && /Linux[\s\S]{0,120}\$0\.006/i.test(text);
  if (!confirmed) throw new Error('Não foi possível confirmar cotas e tarifa Linux na documentação oficial atual do GitHub.');
  return { free: 2000, pro: 3000, linuxRate: 0.006 };
}

async function gmailToken() {
  for (const key of ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN']) {
    if (!process.env[key]) throw new Error(`${key} ausente.`);
  }
  const body = new URLSearchParams({ client_id: process.env.GMAIL_CLIENT_ID, client_secret: process.env.GMAIL_CLIENT_SECRET, refresh_token: process.env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(`Falha no OAuth do Gmail: ${JSON.stringify(data)}`);
  return data.access_token;
}

function encodeHeader(value) { return `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`; }
async function sendEmail(subject, plain, html) {
  const boundary = `trofia-${Date.now()}`;
  const raw = [
    `From: ${SENDER}`, `To: ${RECIPIENT}`, `Subject: ${encodeHeader(subject)}`, 'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '', `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', plain,
    `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', html,
    `--${boundary}--`, '',
  ].join('\r\n');
  const token = await gmailToken();
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Falha no Gmail: ${JSON.stringify(data)}`);
  console.log(JSON.stringify({ sent: true, to: RECIPIENT, subject, messageId: data.id }));
}

function shell(title, subtitle, body) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f6f4;color:#20332a;font-family:Segoe UI,Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" style="max-width:760px;background:#fff;border:1px solid #dce6df;border-radius:14px;overflow:hidden"><tr><td style="padding:28px 30px;background:#174f3b;color:#fff"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.8">Trofia</div><h1 style="margin:8px 0 5px;font-size:26px">${escapeHtml(title)}</h1><div style="font-size:14px;opacity:.85">${escapeHtml(subtitle)}</div></td></tr><tr><td style="padding:24px 30px">${body}</td></tr></table></td></tr></table></body></html>`;
}

function htmlTable(headers, rows) {
  return `<div style="overflow-x:auto"><table width="100%" style="border-collapse:collapse;font-size:14px"><tr style="background:#edf5f0">${headers.map((h) => `<th align="left" style="padding:10px;border:1px solid #d7e3dc">${escapeHtml(h)}</th>`).join('')}</tr>${rows.map((row) => `<tr>${row.map((cell) => `<td style="padding:10px;border:1px solid #d7e3dc;vertical-align:top">${cell}</td>`).join('')}</tr>`).join('')}</table></div>`;
}

function cards(items) {
  return `<table role="presentation" width="100%">${items.map((item, index) => `${index % 2 === 0 ? '<tr>' : ''}<td width="50%" style="padding:5px;vertical-align:top"><div style="padding:16px;background:${item.warn ? '#fff1eb' : '#edf5f0'};border-radius:9px"><div style="font-size:12px;color:#66756d;text-transform:uppercase">${escapeHtml(item.label)}</div><div style="margin-top:5px;font-size:22px;font-weight:700;color:${item.warn ? '#a3441d' : '#174f3b'}">${escapeHtml(item.value)}</div><div style="font-size:13px;color:#66756d">${escapeHtml(item.note || '')}</div></div></td>${index % 2 === 1 || index === items.length - 1 ? '</tr>' : ''}`).join('')}</table>`;
}

function ciPlain(title, data, rules) {
  return `${title}\n\nConsumo: ${data.total} min\nCI leve: ${data.leve} min\nCI pesado: ${data.pesado} min\nMédia diária: ${data.average.toFixed(1)} min/dia\nProjeção: ${Math.round(data.projection)} min\nFree: ${pct(data.total, rules.free)}\nPro: ${pct(data.total, rules.pro)}\n\nEstes minutos são grátis hoje porque o repositório é público — isto é uma simulação para apoiar a decisão de tornar o repositório privado no futuro.`;
}

async function renderCi(current, rules, { previous = null, closing = false } = {}) {
  const elapsedDays = Math.max(1 / 24, (current.end - current.start) / 86400000);
  current.average = current.total / elapsedDays;
  const daysInMonth = new Date(Date.UTC(localDate(current.start).year, localDate(current.start).month, 0)).getUTCDate();
  current.projection = closing ? current.total : current.average * daysInMonth;
  const overPro = Math.max(0, current.projection - rules.pro);
  const title = closing ? `Fechamento de CI de ${new Intl.DateTimeFormat('pt-BR', { timeZone: ZONE, month: 'long' }).format(current.end)}` : 'Consumo de CI do mês';
  let body = `<div style="padding:14px 16px;background:#fff8dc;border-left:4px solid #d7a51e;border-radius:6px;font-size:14px"><strong>Contexto:</strong> Estes minutos são grátis hoje porque o repositório é público — isto é uma simulação para apoiar a decisão de tornar o repositório privado no futuro.</div><h2 style="color:#174f3b">${closing ? 'Fechamento do mês' : 'Visão geral'}</h2>`;
  body += cards([
    { label: 'Consumo acumulado', value: `${current.total} min`, note: `${current.runs} runs · ${current.jobs} jobs` },
    { label: 'Média diária', value: `${current.average.toFixed(1).replace('.', ',')} min/dia` },
    { label: 'Situação no Free', value: current.total > rules.free ? `${current.total - rules.free} min acima` : `${rules.free - current.total} min disponíveis`, note: pct(current.total, rules.free), warn: current.total > rules.free },
    { label: 'Situação no Pro', value: current.total > rules.pro ? `${current.total - rules.pro} min acima` : `${rules.pro - current.total} min disponíveis`, note: `${pct(current.total, rules.pro)} · ${current.total > rules.pro ? `aprox. ${money((current.total - rules.pro) * rules.linuxRate)}` : 'US$ 0 extra'}`, warn: current.total > rules.pro },
  ]);
  if (!closing) body += `<h2 style="color:#174f3b">Tendência</h2>${htmlTable(['Indicador', 'Resultado'], [['Projeção de fim do mês', `<strong>${Math.round(current.projection)} min</strong>`], ['Free projetado', pct(current.projection, rules.free)], ['Pro projetado', pct(current.projection, rules.pro)], ['Excedente Pro projetado', overPro ? `${Math.round(overPro)} min · aprox. ${money(overPro * rules.linuxRate)}` : 'nenhum']])}`;
  if (previous) {
    const variation = (a, b) => b ? `${((a - b) / b * 100).toFixed(1).replace('.', ',')}%` : 'não determinado';
    body += `<h2 style="color:#174f3b">Mês atual comparado com mês anterior</h2>${htmlTable(['Indicador', previous.label, current.label, 'Variação'], [
      ['Consumo total', `${previous.total} min`, `${current.total} min`, variation(current.total, previous.total)],
      ['CI pesado', `${previous.pesado} min`, `${current.pesado} min`, variation(current.pesado, previous.pesado)],
      ['CI leve', `${previous.leve} min`, `${current.leve} min`, variation(current.leve, previous.leve)],
      ['PRs mesclados', String(previous.prs), String(current.prs), variation(current.prs, previous.prs)],
      ['Commits na main', String(previous.commits), String(current.commits), variation(current.commits, previous.commits)],
    ])}<h2 style="color:#174f3b">Leitura rápida</h2><p style="line-height:1.65">O consumo mudou ${variation(current.total, previous.total)} em relação ao mês anterior. O Free ${current.total > rules.free ? 'seria insuficiente' : 'comportaria o período'} e o Pro ${current.total > rules.pro ? `teria excedente aproximado de ${money((current.total - rules.pro) * rules.linuxRate)}` : 'comportaria o período sem custo adicional'}. PRs e commits são mostrados ao lado dos minutos para contextualizar a variação de atividade, sem presumir causalidade.</p>`;
  }
  body += `<h2 style="color:#174f3b">Composição por workflow</h2>${htmlTable(['Workflow', 'Runs', 'Jobs', 'Classe', 'Minutos'], Object.entries(current.workflows).sort((a, b) => b[1].minutes - a[1].minutes).map(([name, row]) => [escapeHtml(name), String(row.runs), String(row.jobs), escapeHtml(row.className), String(row.minutes)]))}<p style="margin-top:22px;color:#64736b;font-size:12px;line-height:1.55">Método: cada job concluído é arredondado para cima até o minuto inteiro. Cotas confirmadas na documentação oficial no momento da execução: Free ${rules.free} min, Pro ${rules.pro} min; tarifa Linux padrão ${money(rules.linuxRate)}/min. Valores financeiros são estimativas, não cobranças reais.</p>`;
  return { title, body };
}

async function ciReport(closing) {
  const now = new Date();
  const local = localDate(now);
  if (closing) {
    const tomorrow = addLocalDays(local, 1);
    if (tomorrow.month === local.month) return console.log(JSON.stringify({ skipped: true, reason: 'não é o último dia do mês' }));
  }
  const currentBounds = monthBounds(local.year, local.month, now);
  const previousMonth = local.month === 1 ? { year: local.year - 1, month: 12 } : { year: local.year, month: local.month - 1 };
  const previousBounds = monthBounds(previousMonth.year, previousMonth.month, new Date(8640000000000000));
  const rules = await billingRules();
  const current = await actionsBetween(currentBounds.start, currentBounds.end);
  Object.assign(current, { ...currentBounds, label: new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: ZONE }).format(currentBounds.start) });
  let previous = null;
  if (closing) {
    previous = await actionsBetween(previousBounds.start, previousBounds.end);
    Object.assign(previous, { ...previousBounds, label: new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: ZONE }).format(previousBounds.start) });
    [current.prs, current.commits, previous.prs, previous.commits] = await Promise.all([
      mergedPrsBetween(current.start, current.end).then((x) => x.length), commitsBetween(current.start, current.end).then((x) => x.length),
      mergedPrsBetween(previous.start, previous.end).then((x) => x.length), commitsBetween(previous.start, previous.end).then((x) => x.length),
    ]);
  }
  const rendered = await renderCi(current, rules, { previous, closing });
  const week = Math.ceil(local.day / 7);
  const subject = closing ? `Trofia — fechamento de CI de ${current.label}/${local.year}` : `Trofia — consumo de CI do mês (semana ${week})`;
  await sendEmail(subject, ciPlain(rendered.title, current, rules), shell(rendered.title, closing ? `${current.label}/${local.year} · até ${localStamp(now)}` : `Semana ${week} · até ${localStamp(now)}`, rendered.body));
}

async function stalePrAlert() {
  const now = new Date();
  const open = await paged('/pulls?state=open');
  const inspected = await mapLimit(open, 6, async (pr) => {
    const [commits, comments, reviews, reviewComments, events, checks] = await Promise.all([
      paged(`/pulls/${pr.number}/commits`), paged(`/issues/${pr.number}/comments`), paged(`/pulls/${pr.number}/reviews`),
      paged(`/pulls/${pr.number}/comments`), paged(`/issues/${pr.number}/events`), github(`/commits/${pr.head.sha}/check-runs`),
    ]);
    const dates = [pr.created_at, pr.updated_at, ...commits.map((x) => x.commit.committer.date), ...comments.map((x) => x.updated_at), ...reviews.map((x) => x.submitted_at), ...reviewComments.map((x) => x.updated_at), ...events.map((x) => x.created_at)].filter(Boolean).map((x) => new Date(x));
    const last = new Date(Math.max(...dates));
    const days = Math.floor((now - last) / 86400000);
    const runs = checks.check_runs || [];
    const ci = !runs.length ? 'Nunca rodou' : runs.some((x) => x.status !== 'completed') ? 'Em andamento' : runs.some((x) => !['success', 'neutral', 'skipped'].includes(x.conclusion)) ? 'Vermelho' : 'Verde';
    const origin = pr.body?.match(/Chat-Origin:\s*([^\r\n]+)/i)?.[1].trim() || 'não informado';
    return { number: pr.number, title: pr.title, origin, days, ci, url: pr.html_url, last };
  });
  const stale = inspected.filter((pr) => now - pr.last > 5 * 86400000).sort((a, b) => b.days - a.days);
  if (!stale.length) return console.log(JSON.stringify({ sent: false, open: open.length, alerts: 0 }));
  const subject = stale.length === 1 ? 'Trofia — PR parado há mais de 5 dias' : `Trofia — ${stale.length} PRs parados há mais de 5 dias`;
  const rows = stale.map((pr) => [`#${pr.number}`, escapeHtml(pr.title), escapeHtml(pr.origin), String(pr.days), pr.ci, `<a href="${pr.url}">Abrir PR</a>`]);
  const body = `<p style="line-height:1.6">PRs ordenados do maior para o menor período sem commit, comentário, revisão ou mudança de estado.</p>${htmlTable(['PR', 'Título', 'Chat-Origin', 'Dias sem atividade', 'Status do CI', 'Link direto'], rows)}`;
  await sendEmail(subject, stale.map((pr) => `#${pr.number} — ${pr.title} — ${pr.days} dias — CI ${pr.ci} — ${pr.url}`).join('\n'), shell('PRs parados', `Verificação de ${localStamp(now)}`, body));
}

function readWeeklyDocs(start, end) {
  const required = ['documentation/README.md', 'documentation/estado-atual/RESUMO-STATUS.md', 'documentation/estado-atual/ROADMAP.md'];
  const changed = execFileSync('git', ['log', `--since=${start.toISOString()}`, `--until=${end.toISOString()}`, '--name-only', '--pretty=format:', '--', 'documentation/historico'], { encoding: 'utf8' }).split(/\r?\n/).filter((file) => /^documentation\/historico\/.+\.md$/.test(file));
  return [...new Set([...required, ...changed])].filter((file) => fs.existsSync(file)).map((file) => `\n=== ${file} ===\n${fs.readFileSync(file, 'utf8')}`).join('').slice(0, 180000);
}

async function openAiJson(input) {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY ausente.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_AUTOMATION_MODEL || 'gpt-5-mini', reasoning: { effort: 'medium' }, input, text: { format: { type: 'json_object' } } }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`OpenAI: ${JSON.stringify(data)}`);
  const output = data.output?.flatMap((item) => item.content || []).find((item) => item.type === 'output_text')?.text || data.output_text;
  return JSON.parse(output);
}

async function weeklyReport() {
  const nowLocal = localDate(new Date());
  const end = zonedToUtc(nowLocal.year, nowLocal.month, nowLocal.day, 5);
  const startLocal = addLocalDays(nowLocal, -7);
  const start = zonedToUtc(startLocal.year, startLocal.month, startLocal.day, 5);
  const [prs, commits, ci] = await Promise.all([mergedPrsBetween(start, new Date(end - 1)), commitsBetween(start, new Date(end - 1)), actionsBetween(start, new Date(end - 1))]);
  const docs = readWeeklyDocs(start, end);
  const source = JSON.stringify({ window: { start: start.toISOString(), endExclusive: end.toISOString(), timezone: ZONE }, indicators: { prs: prs.length, commits: commits.length, ci }, prs: prs.map((pr) => ({ number: pr.number, title: pr.title, merged_at: pr.merged_at, body: pr.body })), commits: commits.map((c) => ({ sha: c.sha.slice(0, 7), date: c.commit.committer.date, message: c.commit.message.split('\n')[0] })), documentation: docs });
  const report = await openAiJson(`Produza dados JSON para o relatório semanal detalhado do Trofia. Responda somente JSON válido. Não invente: use "não determinado" quando faltar dado. Explique termos técnicos em linguagem simples. Use alinhamento percentual somente quando existir fonte real e preserve qualificações textuais. Estrutura: {"objectiveRows":[{"item":"","status":"","result":"","alignment":""}],"executiveSummary":"","deliveries":[{"title":"","why":"","done":"","impact":"","problems":"","outcome":"","alignment":""}],"blockers":"","adherence":[{"item":"","planned":"","implemented":"","alignment":"","cause":""}],"pending":[{"priority":"","item":"","why":"","risk":"","scope":"","complexity":"","resources":"","estimate":""}],"nextWeek":""}. Fontes:\n${source}`);
  const sections = [
    htmlTable(['Item', 'Status', 'Resultado', 'Alinhamento'], report.objectiveRows.map((x) => [escapeHtml(x.item), escapeHtml(x.status), escapeHtml(x.result), escapeHtml(x.alignment)])),
    `<h2 style="color:#174f3b">Síntese executiva</h2><p style="line-height:1.7">${escapeHtml(report.executiveSummary)}</p>`,
    `<h2 style="color:#174f3b">Indicadores</h2>${htmlTable(['PRs', 'Commits', 'CI leve', 'CI pesado', 'CI total'], [[String(prs.length), String(commits.length), `${ci.leve} min`, `${ci.pesado} min`, `${ci.total} min`]])}`,
    `<h2 style="color:#174f3b">Entregas concluídas</h2>${report.deliveries.map((x) => `<div style="margin:14px 0;padding:14px;border:1px solid #dce6df;border-radius:8px"><strong>${escapeHtml(x.title)}</strong><p><b>Por quê:</b> ${escapeHtml(x.why)}</p><p><b>O que foi feito:</b> ${escapeHtml(x.done)}</p><p><b>Impacto:</b> ${escapeHtml(x.impact)}</p><p><b>Problemas:</b> ${escapeHtml(x.problems)}</p><p><b>Resultado:</b> ${escapeHtml(x.outcome)}</p><p><b>Alinhamento:</b> ${escapeHtml(x.alignment)}</p></div>`).join('')}`,
    `<h2 style="color:#174f3b">Bloqueios e não concluído</h2><p style="line-height:1.7">${escapeHtml(report.blockers)}</p>`,
    `<h2 style="color:#174f3b">Planejado versus implementado</h2>${htmlTable(['Item', 'Planejado', 'Implementado', 'Alinhamento', 'Causa'], report.adherence.map((x) => [escapeHtml(x.item), escapeHtml(x.planned), escapeHtml(x.implemented), escapeHtml(x.alignment), escapeHtml(x.cause)]))}`,
    `<h2 style="color:#174f3b">Pendências</h2>${htmlTable(['Prioridade', 'Pendência', 'Importância', 'Risco', 'Escopo', 'Complexidade', 'Recursos', 'Tempo Codex'], report.pending.map((x) => [escapeHtml(x.priority), escapeHtml(x.item), escapeHtml(x.why), escapeHtml(x.risk), escapeHtml(x.scope), escapeHtml(x.complexity), escapeHtml(x.resources), escapeHtml(x.estimate)]))}`,
    `<h2 style="color:#174f3b">Semana que começa</h2><p style="line-height:1.7">${escapeHtml(report.nextWeek)}</p>`,
    `<h2 style="color:#174f3b">PRs e commits</h2><p style="line-height:1.6">${prs.map((pr) => `<a href="${pr.html_url}">#${pr.number}</a> ${escapeHtml(pr.title)}`).join('<br>')}</p><p style="font-family:Consolas,monospace;font-size:12px">${commits.map((c) => `${c.sha.slice(0, 7)} ${escapeHtml(c.commit.message.split('\n')[0])}`).join('<br>')}</p>`,
    `<div style="margin-top:24px;padding:14px;background:#f7f8f7;border-radius:8px;font-family:Consolas,monospace;font-size:12px"><strong>Resumo em texto simples</strong><br>${prs.length} PRs; ${commits.length} commits; ${ci.total} min de CI (${ci.leve} leve + ${ci.pesado} pesado).<br>${escapeHtml(report.executiveSummary)}</div>`,
  ];
  const subject = `Relatório Trofia — ${ddmm(start)} a ${ddmm(end)}`;
  const plain = `${subject}\n\n${report.executiveSummary}\n\nPRs: ${prs.length}\nCommits: ${commits.length}\nCI: ${ci.total} min (${ci.leve} leve + ${ci.pesado} pesado)\n\nPendências:\n${report.pending.map((x) => `- ${x.priority}: ${x.item} — ${x.why}`).join('\n')}`;
  await sendEmail(subject, plain, shell('Relatório semanal', `${ddmm(start)} às 05:00 a ${ddmm(end)} às 04:59 · Europe/Madrid`, sections.join('')));
}

if (mode === 'stale-pr') await stalePrAlert();
else if (mode === 'ci-weekly') await ciReport(false);
else if (mode === 'ci-monthly') await ciReport(true);
else if (mode === 'weekly-report') await weeklyReport();
else throw new Error(`Modo inválido: ${mode}`);

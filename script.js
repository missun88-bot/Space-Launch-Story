const COLORS = {
  "United States": "#0086ad",
  "Russia/Soviet Union": "#36648b",
  "China": "#bf616a",
  "Major Non-NATO Ally": "#c68642",
  "NATO Ally": "#c6b54c",
  "Other": "#c7839c"
};

const GROUP_ORDER = [
  "Russia/Soviet Union",
  "United States",
  "China",
  "NATO Ally",
  "Major Non-NATO Ally",
  "Other"
];

const START_X = {
  "Russia/Soviet Union": -0.833,
  "United States": -0.500,
  "China": -0.167,
  "NATO Ally": 0.167,
  "Major Non-NATO Ally": 0.500,
  "Other": 0.833
};

const START_Y = -0.05;
const CONTROL_Y = 0.55;
const START_ANGLE = 170;
const END_ANGLE = 10;
const SVG_NS = "http://www.w3.org/2000/svg";

const chart = document.querySelector("#fan-chart");
const tooltip = document.querySelector("#tooltip");
const title = document.querySelector("#visual-title");
const period = document.querySelector("#period-label");

function svgEl(name, attrs = {}) {
  const el = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else {
      if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const headers = rows.shift();
  return rows.filter(r => r.length && r.some(v => v !== "")).map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i] ?? "");
    return obj;
  });
}

function fmtDate(date) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}
function fmtNumber(n) { return new Intl.NumberFormat("en-CA").format(n); }
function fmtPct(n, total) { return `${(n / total * 100).toFixed(1)}%`; }
function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return v => rangeMin + ((v - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}
function showTooltip(event, d) {
  tooltip.innerHTML = `
    <strong>${d["Launch Vehicle"] || "Launch mission"}</strong>
    <div class="tooltip-row"><span>Date</span><span>${fmtDate(d.date)}</span></div>
    <div class="tooltip-row"><span>Country</span><span>${d.Country}</span></div>
    <div class="tooltip-row"><span>Group</span><span>${d["Country Group"]}</span></div>
    <div class="tooltip-row"><span>Site</span><span>${d["Launch Site Name"] || d["Launch Site"] || "—"}</span></div>
    <div class="tooltip-row"><span>Outcome</span><span>${d["Launch Outcome"] || "—"}</span></div>`;
  tooltip.style.opacity = "1";
  tooltip.setAttribute("aria-hidden", "false");
  moveTooltip(event);
}
function showHtmlTooltip(event, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  tooltip.setAttribute("aria-hidden", "false");
  moveTooltip(event);
}
function moveTooltip(event) {
  const w = tooltip.offsetWidth || 265, h = tooltip.offsetHeight || 150;
  let x = event.clientX + 16, y = event.clientY + 16;
  if (x + w > window.innerWidth - 12) x = event.clientX - w - 16;
  if (y + h > window.innerHeight - 12) y = event.clientY - h - 16;
  tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
}
function hideTooltip() { tooltip.style.opacity = "0"; tooltip.setAttribute("aria-hidden", "true"); }

function buildAnnualChart(data) {
  const wrap = document.querySelector('#annual-chart');
  const years = [];
  for (let y = 2017; y <= 2026; y++) years.push(y);
  const countsMap = new Map(years.map(y => [y, 0]));
  data.forEach(d => countsMap.set(d.year, (countsMap.get(d.year) || 0) + 1));
  const annual = years.map(year => ({ year, value: countsMap.get(year) || 0 }));
  const peak = annual.reduce((a, b) => a.value >= b.value ? a : b);

  document.querySelector('#peak-year-stat').textContent = `Peak: ${peak.year} · ${fmtNumber(peak.value)}`;
  document.querySelector('#trend-note').textContent = `Peak activity came in ${peak.year} with ${fmtNumber(peak.value)} launches, while 2026 remains a partial year in this dataset.`;

  const w = 980, h = 420, m = { t: 20, r: 24, b: 52, l: 44 };
  const innerW = w - m.l - m.r, innerH = h - m.t - m.b;
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' });
  wrap.appendChild(svg);
  const g = svgEl('g', { transform: `translate(${m.l},${m.t})` });
  svg.appendChild(g);

  const xStep = innerW / annual.length;
  const barW = xStep * 0.68;
  const maxVal = Math.max(...annual.map(d => d.value));
  const y = scaleLinear(0, maxVal * 1.08, innerH, 0);

  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const yy = y(v);
    g.appendChild(svgEl('line', { x1: 0, y1: yy, x2: innerW, y2: yy, class: 'chart-grid' }));
    const label = svgEl('text', { x: -10, y: yy + 4, 'text-anchor': 'end', class: 'chart-axis' });
    label.textContent = Math.round(v);
    g.appendChild(label);
  }

  annual.forEach((d, i) => {
    const x = i * xStep + (xStep - barW) / 2;
    const height = innerH - y(d.value);
    const klass = ['annual-bar'];
    if (d.year === peak.year) klass.push('highlight');
    if (d.year === 2026) klass.push('partial');
    const rect = svgEl('rect', { x, y: y(d.value), width: barW, height, rx: 5, class: klass.join(' ') });
    rect.addEventListener('mouseenter', e => showHtmlTooltip(e, `<strong>${d.year}</strong><div class="tooltip-row"><span>Launches</span><span>${fmtNumber(d.value)}</span></div>${d.year === 2026 ? '<div class="tooltip-row"><span>Note</span><span>Partial year</span></div>' : ''}`));
    rect.addEventListener('mousemove', moveTooltip);
    rect.addEventListener('mouseleave', hideTooltip);
    g.appendChild(rect);

    const yearLabel = svgEl('text', { x: x + barW / 2, y: innerH + 20, 'text-anchor': 'middle', class: 'chart-axis' });
    yearLabel.textContent = d.year;
    g.appendChild(yearLabel);

    const valueLabel = svgEl('text', { x: x + barW / 2, y: y(d.value) - 8, 'text-anchor': 'middle', class: 'value-label' });
    valueLabel.textContent = d.value;
    g.appendChild(valueLabel);
  });
}

function buildMapChart(data) {
  const wrap = document.querySelector('#map-chart');
  const siteMap = new Map();

  for (const d of data) {
    const lat = Number(d.Latitude), lon = Number(d.Longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const key = `${d['Launch Site Name'] || d['Launch Site']}|${lat}|${lon}|${d['Country Group']}`;
    if (!siteMap.has(key)) {
      siteMap.set(key, {
        site: d['Launch Site Name'] || d['Launch Site'],
        lat, lon,
        group: d['Country Group'],
        country: d.Country,
        value: 0
      });
    }
    siteMap.get(key).value += 1;
  }

  const sites = [...siteMap.values()].sort((a, b) => b.value - a.value);
  const top = sites[0];
  document.querySelector('#site-stat').textContent = `${sites.length} launch sites · largest ${fmtNumber(top.value)}`;

  // The background is a true locally stored world map generated from country
  // and coastline boundaries. It uses the same equirectangular projection as
  // the launch-site markers, so everything stays aligned without an API.
  const w = 1000, h = 440;
  const lonMin = -180, lonMax = 180, latMin = -60, latMax = 85;
  const x = lon => ((lon - lonMin) / (lonMax - lonMin)) * w;
  const y = lat => ((latMax - lat) / (latMax - latMin)) * h;
  const maxSite = Math.max(...sites.map(d => d.value));
  const radius = value => 4.2 + Math.sqrt(value / maxSite) * 11.5;

  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' });
  wrap.appendChild(svg);

  const mapImage = svgEl('image', {
    href: 'assets/world-map.svg?v=1.0',
    x: 0,
    y: 0,
    width: w,
    height: h,
    preserveAspectRatio: 'none',
    class: 'world-map-image'
  });
  svg.appendChild(mapImage);

  // Small site markers sit on top of the map. Size reflects launch volume,
  // but the geography remains the primary visual rather than a bubble chart.
  sites.slice().reverse().forEach(site => {
    if (site.lat < latMin || site.lat > latMax) return;
    const marker = svgEl('circle', {
      cx: x(site.lon),
      cy: y(site.lat),
      r: radius(site.value),
      fill: COLORS[site.group] || '#ccc',
      class: 'site-marker'
    });
    const html = `<strong>${site.site}</strong>
      <div class="tooltip-row"><span>Launches</span><span>${fmtNumber(site.value)}</span></div>
      <div class="tooltip-row"><span>Country</span><span>${site.country}</span></div>
      <div class="tooltip-row"><span>Group</span><span>${site.group}</span></div>`;
    marker.addEventListener('mouseenter', e => showHtmlTooltip(e, html));
    marker.addEventListener('mousemove', moveTooltip);
    marker.addEventListener('mouseleave', hideTooltip);
    svg.appendChild(marker);
  });

  // Permanent map labels are intentionally omitted. Hover a marker for details.
}

function buildOutcomeChart(data) {
  const wrap = document.querySelector('#outcome-chart');
  const order = ['Success', 'Failure', 'Abort or Failure on Pad'];
  const counts = new Map(order.map(o => [o, 0]));
  data.forEach(d => counts.set(d['Launch Outcome'], (counts.get(d['Launch Outcome']) || 0) + 1));
  const rows = order.map(name => ({ name, value: counts.get(name) || 0 }));
  const total = rows.reduce((s, d) => s + d.value, 0);
  const success = rows.find(d => d.name === 'Success');
  document.querySelector('#success-rate-stat').textContent = `${fmtPct(success.value, total)} success`;
  document.querySelector('#outcome-note').textContent = `${fmtNumber(success.value)} of ${fmtNumber(total)} launches were successful (${fmtPct(success.value, total)}).`;

  const w = 1000, h = 360, m = { t: 24, r: 28, b: 28, l: 325 };
  const innerW = w - m.l - m.r, innerH = h - m.t - m.b;
  const rowH = innerH / rows.length;
  const maxVal = Math.max(...rows.map(d => d.value));
  const x = scaleLinear(0, maxVal * 1.05, 0, innerW);

  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'xMidYMid meet' });
  wrap.appendChild(svg);
  const g = svgEl('g', { transform: `translate(${m.l},${m.t})` });
  svg.appendChild(g);

  for (let i = 0; i <= 4; i++) {
    const v = (maxVal / 4) * i;
    const xx = x(v);
    g.appendChild(svgEl('line', { x1: xx, y1: 0, x2: xx, y2: innerH, class: 'outcome-grid' }));
    const label = svgEl('text', { x: m.l + xx, y: h - 4, 'text-anchor': 'middle', class: 'outcome-axis' });
    label.textContent = Math.round(v);
    svg.appendChild(label);
  }

  rows.forEach((d, i) => {
    const yPos = i * rowH + rowH * 0.18;
    const barH = rowH * 0.54;
    const label = svgEl('text', { x: m.l - 14, y: m.t + yPos + barH * 0.7, 'text-anchor': 'end', class: 'outcome-category' });
    label.textContent = d.name;
    svg.appendChild(label);

    const bar = svgEl('rect', { x: 0, y: yPos, width: x(d.value), height: barH, rx: 8, class: `outcome-bar ${d.name === 'Success' ? 'success' : d.name === 'Failure' ? 'failure' : 'abort'}` });
    bar.addEventListener('mouseenter', e => showHtmlTooltip(e, `<strong>${d.name}</strong><div class="tooltip-row"><span>Launches</span><span>${fmtNumber(d.value)}</span></div><div class="tooltip-row"><span>Share</span><span>${fmtPct(d.value, total)}</span></div>`));
    bar.addEventListener('mousemove', moveTooltip);
    bar.addEventListener('mouseleave', hideTooltip);
    g.appendChild(bar);

    const value = svgEl('text', { x: x(d.value) + 10, y: yPos + barH * 0.72, class: 'outcome-value' });
    value.textContent = `${fmtNumber(d.value)} · ${fmtPct(d.value, total)}`;
    g.appendChild(value);
  });
}

async function init() {
  const response = await fetch('data/launches.csv');
  if (!response.ok) throw new Error(`CSV load failed: ${response.status}`);
  const raw = parseCSV(await response.text());
  const data = raw.map(d => ({
    ...d,
    date: new Date(`${d['Launch Date']}T00:00:00`),
    year: Number(d['Launch Date'].slice(0, 4))
  })).filter(d => !Number.isNaN(d.date.getTime()));

  data.sort((a, b) => a.date - b.date);
  const minDate = data[0].date;
  const maxDate = data[data.length - 1].date;
  const counts = new Map(GROUP_ORDER.map(g => [g, 0]));
  data.forEach(d => counts.set(d['Country Group'], (counts.get(d['Country Group']) || 0) + 1));

  const vbW = 1200, vbH = 720;
  const svg = svgEl('svg', { viewBox: `0 0 ${vbW} ${vbH}`, preserveAspectRatio: 'xMidYMin meet' });
  chart.appendChild(svg);
  const x = scaleLinear(-1.06, 1.06, 55, 1145);
  const y = scaleLinear(-0.19, 1.07, 690, 48);

  function datePoint(date) {
    const t = (date - minDate) / (maxDate - minDate);
    const angle = (START_ANGLE - (START_ANGLE - END_ANGLE) * t) * Math.PI / 180;
    return { x: Math.cos(angle), y: Math.sin(angle), t, angle };
  }
  function pathFor(d) {
    const sx = START_X[d['Country Group']];
    const ep = datePoint(d.date);
    const c1x = sx * 0.60;
    const c2x = ep.x * 0.85;
    return `M${x(sx)},${y(START_Y)} C${x(c1x)},${y(CONTROL_Y)} ${x(c2x)},${y(CONTROL_Y)} ${x(ep.x)},${y(ep.y)}`;
  }

  let guideD = '';
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const angle = (START_ANGLE - (START_ANGLE - END_ANGLE) * t) * Math.PI / 180;
    const px = x(Math.cos(angle)), py = y(Math.sin(angle));
    guideD += `${i === 0 ? 'M' : 'L'}${px},${py}`;
  }
  svg.appendChild(svgEl('path', { class: 'arc-guide', d: guideD }));

  const yearG = svgEl('g');
  svg.appendChild(yearG);
  for (let yr = 2017; yr <= 2026; yr++) {
    let date = new Date(`${yr}-01-01T00:00:00`);
    if (date < minDate) date = minDate;
    if (date > maxDate) continue;
    const p = datePoint(date), px = x(p.x), py = y(p.y), innerR = 0.965;
    const g = svgEl('g', { class: 'year-tick' });
    g.appendChild(svgEl('line', { x1: x(Math.cos(p.angle) * innerR), y1: y(Math.sin(p.angle) * innerR), x2: px, y2: py }));
    const text = svgEl('text', { x: x(Math.cos(p.angle) * 1.025), y: y(Math.sin(p.angle) * 1.025), 'text-anchor': 'middle', 'dominant-baseline': 'middle' });
    text.textContent = yr;
    g.appendChild(text);
    yearG.appendChild(g);
  }

  const launchG = svgEl('g', { class: 'launches' });
  svg.appendChild(launchG);
  const pathItems = data.map(d => {
    const p = svgEl('path', { class: 'launch-path', d: pathFor(d), stroke: COLORS[d['Country Group']] || '#aaa', opacity: '0.37' });
    p.__data__ = d;
    p.addEventListener('mouseenter', e => showTooltip(e, d));
    p.addEventListener('mousemove', moveTooltip);
    p.addEventListener('mouseleave', hideTooltip);
    launchG.appendChild(p);
    return p;
  });

  const maxCount = Math.max(...counts.values());
  const radius = c => 16 + Math.sqrt(c / maxCount) * 32;
  const anchors = svgEl('g', { class: 'anchors' });
  svg.appendChild(anchors);
  const anchorItems = [];

  GROUP_ORDER.forEach(group => {
    const r = radius(counts.get(group) || 0);
    const g = svgEl('g', { class: 'anchor', 'data-group': group, transform: `translate(${x(START_X[group])},${y(START_Y)})` });
    const circle = svgEl('circle', { class: 'anchor-circle', r, fill: COLORS[group], stroke: COLORS[group] });
    const core = svgEl('circle', { class: 'anchor-core', r: 4, fill: COLORS[group] });
    const label = svgEl('text', { class: 'anchor-label', y: r + 21 });
    label.textContent = group === 'Russia/Soviet Union' ? 'Russia / Soviet Union' : group;
    const count = svgEl('text', { class: 'anchor-count', y: r + 39 });
    count.textContent = fmtNumber(counts.get(group) || 0);
    g.append(circle, core, label, count);
    anchors.appendChild(g);
    anchorItems.push({ group, g, circle, core, texts: [label, count] });
  });

  const legend = document.querySelector('#legend');
  const legendItems = [];
  GROUP_ORDER.forEach(group => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.dataset.group = group;
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = COLORS[group];
    const txt = document.createElement('span');
    txt.textContent = `${group} · ${fmtNumber(counts.get(group) || 0)}`;
    item.append(swatch, txt);
    legend.appendChild(item);
    legendItems.push({ group, item });
  });

  function setMode(step) {
    const mode = step.dataset.mode;
    const selectedGroup = step.dataset.group;
    const selectedYear = step.dataset.year ? Number(step.dataset.year) : null;
    title.textContent = step.dataset.title || '1,723 launches, six geopolitical groups';
    period.textContent = step.dataset.period || '2017–2026';

    pathItems.forEach(p => {
      const d = p.__data__;
      let opacity = 0.37, pointer = 'stroke';
      if (mode === 'group') {
        const active = d['Country Group'] === selectedGroup;
        opacity = active ? 0.78 : 0.025;
        pointer = active ? 'stroke' : 'none';
      } else if (mode === 'year') {
        const active = d.year <= selectedYear;
        opacity = active ? 0.48 : 0.015;
        pointer = active ? 'stroke' : 'none';
      }
      p.setAttribute('opacity', opacity);
      p.style.pointerEvents = pointer;
    });

    anchorItems.forEach(a => {
      const active = a.group === selectedGroup;
      a.circle.setAttribute('opacity', mode === 'group' ? (active ? 0.32 : 0.045) : 0.14);
      a.core.setAttribute('opacity', mode === 'group' ? (active ? 1 : 0.15) : 0.85);
      a.texts.forEach(t => t.setAttribute('opacity', mode === 'group' ? (active ? 1 : 0.18) : 1));
    });
    legendItems.forEach(l => {
      l.item.style.opacity = mode === 'group' ? (l.group === selectedGroup ? 1 : 0.16) : 1;
    });
  }

  const steps = [...document.querySelectorAll('.step')];
  let activeStep = null;
  let scrollTicking = false;

  function activateStep(step) {
    if (!step || step === activeStep) return;
    activeStep = step;
    steps.forEach(s => s.classList.toggle('is-active', s === step));
    setMode(step);
  }

  function updateActiveStep() {
    const triggerY = window.innerHeight * 0.52;
    let candidate = null;
    let closest = Infinity;

    for (const step of steps) {
      const rect = step.getBoundingClientRect();
      if (rect.top <= triggerY && rect.bottom >= triggerY) {
        candidate = step;
        break;
      }
      const distance = Math.abs((rect.top + rect.bottom) / 2 - triggerY);
      if (distance < closest) {
        closest = distance;
        candidate = step;
      }
    }
    activateStep(candidate);
    scrollTicking = false;
  }

  function requestStepUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateActiveStep);
  }

  window.addEventListener('scroll', requestStepUpdate, { passive: true });
  window.addEventListener('resize', requestStepUpdate);
  activateStep(steps[0]);
  requestStepUpdate();

  buildAnnualChart(data);
  buildMapChart(data);
  buildOutcomeChart(data);
}

init().catch(err => {
  console.error(err);
  const msg = document.createElement('div');
  msg.style.padding = '30px';
  msg.style.color = '#ffb4b4';
  msg.textContent = 'Could not load the local CSV. Start the local-only server with: py -m http.server 8000 --bind 127.0.0.1';
  chart.appendChild(msg);
});

'use strict';

const SAMPLE_DATA = {
  students: {
    name: 'Student records',
    description: 'Student records · demo dataset',
    filename: 'student_records.json',
    records: [
      {student_id:'ST-101', name:'Aarav Mehta', course:'Python', score:88, attendance:94, study_hours:12},
      {student_id:'ST-102', name:'Maya Iyer', course:'Python', score:92, attendance:98, study_hours:15},
      {student_id:'ST-103', name:'Rohan Das', course:'Data Science', score:76, attendance:83, study_hours:8},
      {student_id:'ST-104', name:'Diya Nair', course:'Data Science', score:95, attendance:96, study_hours:17},
      {student_id:'ST-105', name:'Kabir Rao', course:'Web Development', score:68, attendance:79, study_hours:6},
      {student_id:'ST-106', name:'Anaya Shah', course:'Python', score:84, attendance:91, study_hours:10},
      {student_id:'ST-107', name:'Ishaan Roy', course:'Web Development', score:73, attendance:null, study_hours:9},
      {student_id:'ST-108', name:'Sara Khan', course:'Data Science', score:89, attendance:95, study_hours:13}
    ]
  },
  employees: {
    name: 'Employee records',
    description: 'Employee records · demo dataset',
    filename: 'employee_records.json',
    records: [
      {employee_id:'E-201', name:'Neha Verma', team:'Engineering', salary:72000, experience_years:4, rating:4.6},
      {employee_id:'E-202', name:'Arjun Patel', team:'Design', salary:64000, experience_years:3, rating:4.2},
      {employee_id:'E-203', name:'Meera Joshi', team:'Engineering', salary:91000, experience_years:7, rating:4.8},
      {employee_id:'E-204', name:'Dev Kapoor', team:'Sales', salary:58000, experience_years:2, rating:3.9},
      {employee_id:'E-205', name:'Tara Menon', team:'People', salary:61000, experience_years:5, rating:4.5},
      {employee_id:'E-206', name:'Vivaan Singh', team:'Sales', salary:67000, experience_years:4, rating:4.1},
      {employee_id:'E-207', name:'Ira Chawla', team:'Engineering', salary:84000, experience_years:6, rating:null},
      {employee_id:'E-208', name:'Reyansh Bose', team:'Design', salary:69000, experience_years:3, rating:4.4}
    ]
  },
  sales: {
    name: 'Sales records',
    description: 'Sales records · demo dataset',
    filename: 'sales_records.json',
    records: [
      {order_id:'OD-501', product:'Notebook', region:'South', units:42, unit_price:120, revenue:5040},
      {order_id:'OD-502', product:'Desk lamp', region:'West', units:18, unit_price:850, revenue:15300},
      {order_id:'OD-503', product:'Water bottle', region:'North', units:31, unit_price:320, revenue:9920},
      {order_id:'OD-504', product:'Notebook', region:'East', units:55, unit_price:120, revenue:6600},
      {order_id:'OD-505', product:'Backpack', region:'South', units:12, unit_price:1450, revenue:17400},
      {order_id:'OD-506', product:'Desk lamp', region:'West', units:24, unit_price:850, revenue:20400},
      {order_id:'OD-507', product:'Backpack', region:'North', units:9, unit_price:1450, revenue:null},
      {order_id:'OD-508', product:'Water bottle', region:'East', units:37, unit_price:320, revenue:11840}
    ]
  }
};

const state = { sample: 'students', filename: SAMPLE_DATA.students.filename, analysis: null, tab: 'records', search: '', rawContent: null };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
let toastTimer = null;

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('en-IN', {maximumFractionDigits: 2}).format(number);
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function showToast(message, kind = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3300);
}
function setBusy(busy) {
  $('#analyze-button').disabled = busy;
  $('#analyze-button').innerHTML = busy
    ? '<span class="button-spark">✳</span> Processing… <span class="button-arrow">↻</span>'
    : '<span class="button-spark">✳</span> Run analysis <span class="button-arrow">→</span>';
  $('#analysis-status').textContent = busy ? 'PROCESSING DATA' : (state.analysis ? 'ANALYSIS COMPLETE' : 'ANALYSIS READY');
}

async function analyzeCurrent() {
  const selected = SAMPLE_DATA[state.sample];
  const filename = state.filename || selected.filename;
  let content = state.rawContent;
  if (content === null) content = JSON.stringify(selected.records);
  setBusy(true);
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({filename, content})
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'Could not analyse this dataset.');
    state.analysis = payload.analysis;
    $('#dataset-description').textContent = `${state.analysis.filename || selected.name} · ${state.analysis.processed_rows} processed rows`;
    $('#analysis-status').textContent = 'ANALYSIS COMPLETE';
    renderAnalysis();
    showToast(`Done — analysed ${state.analysis.processed_rows} records with Python.`);
  } catch (error) {
    $('#analysis-status').textContent = 'CHECK INPUT';
    showToast(error.message || 'Something went wrong. Try another file.', 'error');
  } finally { setBusy(false); }
}

function renderAnalysis() {
  const a = state.analysis;
  if (!a) return;
  $('#metric-rows').textContent = formatNumber(a.processed_rows);
  $('#metric-fields').textContent = formatNumber(a.column_count);
  $('#metric-numeric').textContent = formatNumber(a.numeric_count);
  $('#metric-missing').textContent = formatNumber(a.missing_total);
  $('#metric-missing-note').textContent = a.missing_total === 0 ? 'No blank cells found' : 'Blank cells detected';
  $('#preview-count').textContent = `${a.processed_rows} rows`;
  $('#table-caption').textContent = `Showing ${Math.min(a.processed_rows, 8)} sample rows · ${a.column_count} fields detected`;
  const totalCells = a.processed_rows * a.column_count;
  const completeness = totalCells ? Math.round(((totalCells - a.missing_total) / totalCells) * 100) : 0;
  $('#health-score').innerHTML = `${completeness}<span>/100</span>`;
  $('#health-percent').textContent = `${completeness}%`;
  $('#health-donut').style.background = `conic-gradient(#7562eb ${completeness * 3.6}deg, #f0eef9 0deg)`;
  $('#health-track-fill').style.width = `${completeness}%`;
  $('#health-missing').textContent = formatNumber(a.missing_total);
  $('#health-duplicates').textContent = formatNumber(a.duplicate_rows);
  const uniqueTotal = a.field_stats.reduce((sum, field) => sum + field.unique, 0);
  $('#health-unique').textContent = formatNumber(uniqueTotal);
  $('#health-tip-text').textContent = a.missing_total === 0
    ? 'Nice and tidy — no blank cells detected in this dataset.'
    : `There ${a.missing_total === 1 ? 'is' : 'are'} ${a.missing_total} missing cell${a.missing_total === 1 ? '' : 's'}. Check those fields before using the data downstream.`;
  renderNumericInsights(a);
  renderTable();
}

function renderNumericInsights(a) {
  const host = $('#numeric-insights');
  const fields = a.field_stats.filter((field) => field.kind === 'numeric');
  if (!fields.length) {
    host.innerHTML = '<div class="empty-state">No numeric columns detected. Try a dataset with number values.</div>';
    return;
  }
  host.innerHTML = fields.slice(0, 6).map((field) => {
    const range = Number(field.max) - Number(field.min);
    const width = range > 0 ? Math.max(9, Math.min(100, (Number(field.mean) - Number(field.min)) / range * 100)) : 50;
    return `<div class="field-row">
      <div class="field-head"><span class="field-name">${escapeHTML(field.name)}</span><span class="field-kind">NUMERIC · ${field.count} values</span></div>
      <div class="field-bar"><span style="width:${width}%"></span></div>
      <div class="stat-inline"><span>MIN <b>${formatNumber(field.min)}</b></span><span>AVG <b>${formatNumber(field.mean)}</b></span><span>MAX <b>${formatNumber(field.max)}</b></span><span>MED <b>${formatNumber(field.median)}</b></span></div>
    </div>`;
  }).join('');
}

function renderTable() {
  const a = state.analysis;
  const host = $('#table-wrap');
  if (!a) return;
  if (state.tab === 'fields') {
    const fields = a.field_stats;
    host.innerHTML = `<table class="data-table"><thead><tr><th>FIELD</th><th>TYPE</th><th>VALUES</th><th>MISSING</th><th>UNIQUE</th><th>SUMMARY</th></tr></thead><tbody>${fields.map((field) => {
      const summary = field.kind === 'numeric'
        ? `Mean ${formatNumber(field.mean)} · median ${formatNumber(field.median)} · range ${formatNumber(field.range)}`
        : field.top_values.slice(0, 2).map((v) => `${escapeHTML(v.value)} (${v.count})`).join(' · ') || 'No populated values';
      return `<tr><td><span class="field-name">${escapeHTML(field.name)}</span></td><td><span class="type-chip ${field.kind === 'categorical' ? 'categorical' : ''}">${field.kind}</span></td><td>${formatNumber(field.count)}</td><td class="${field.missing ? 'cell-missing' : ''}">${formatNumber(field.missing)}</td><td>${formatNumber(field.unique)}</td><td><div class="field-summary-cell">${summary}</div></td></tr>`;
    }).join('')}</tbody></table>`;
    $('#table-caption').textContent = `${fields.length} field summaries · numeric and categorical`; return;
  }
  const allRows = a.preview.filter((record) => !state.search || Object.values(record).some((value) => String(value ?? '').toLowerCase().includes(state.search.toLowerCase())));
  if (!allRows.length) {
    host.innerHTML = '<div class="empty-table"><span>⌕</span><b>No matching rows</b><small>Try a different search term.</small></div>';
    $('#table-caption').textContent = 'No rows match the current search'; return;
  }
  host.innerHTML = `<table class="data-table"><thead><tr><th>#</th>${a.columns.map((col) => `<th>${escapeHTML(col.replace(/_/g, ' ').toUpperCase())}</th>`).join('')}</tr></thead><tbody>${allRows.map((row) => `<tr><td class="row-index">${a.preview.indexOf(row) + 1}</td>${a.columns.map((col) => {
    const value = row[col];
    return `<td class="${value === null || value === '' ? 'cell-missing' : ''}">${value === null || value === '' ? 'missing' : escapeHTML(value)}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`;
  $('#table-caption').textContent = `Showing ${allRows.length} of ${Math.min(a.processed_rows, 8)} preview rows · search filters preview only`;
}

function selectSample(key) {
  if (!SAMPLE_DATA[key]) return;
  state.sample = key;
  state.filename = SAMPLE_DATA[key].filename;
  state.rawContent = null;
  $('#file-label').textContent = 'Choose a .csv or .json file from your computer';
  $$('.sample-button').forEach((button) => button.classList.toggle('selected', button.dataset.sample === key));
  analyzeCurrent();
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function toCSV(records, columns) {
  const cell = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [columns.map(cell).join(','), ...records.map((record) => columns.map((column) => cell(record[column])).join(','))].join('\r\n');
}

async function loadFile(file) {
  if (!file) return;
  const extension = file.name.toLowerCase().split('.').pop();
  if (!['csv', 'json'].includes(extension)) { showToast('Please choose a .csv or .json file.', 'error'); return; }
  if (file.size > 2 * 1024 * 1024) { showToast('Please keep the upload below 2 MB.', 'error'); return; }
  try {
    const content = await file.text();
    state.sample = null;
    state.filename = file.name;
    state.rawContent = content;
    $$('.sample-button').forEach((button) => button.classList.remove('selected'));
    $('#file-label').textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB selected`;
    await analyzeCurrent();
  } catch (error) {
    showToast('Could not read that file. Try another CSV or JSON file.', 'error');
  }
}

$$('.sample-button').forEach((button) => button.addEventListener('click', () => selectSample(button.dataset.sample)));
$('#analyze-button').addEventListener('click', analyzeCurrent);
$('#file-input').addEventListener('change', (event) => loadFile(event.target.files[0]));
$('#record-search').addEventListener('input', (event) => { state.search = event.target.value; if (state.tab === 'records') renderTable(); });
$('#tab-records').addEventListener('click', () => { state.tab = 'records'; $('#tab-records').classList.add('active'); $('#tab-fields').classList.remove('active'); $('#record-search').placeholder = 'Search visible rows…'; $('#record-search').disabled = false; renderTable(); });
$('#tab-fields').addEventListener('click', () => { state.tab = 'fields'; $('#tab-fields').classList.add('active'); $('#tab-records').classList.remove('active'); $('#record-search').placeholder = 'Field search applies in records'; $('#record-search').disabled = true; renderTable(); });
$('#export-csv').addEventListener('click', () => {
  if (!state.analysis) { showToast('Run an analysis before exporting.', 'error'); return; }
  const a = state.analysis;
  downloadBlob('recordlab-processed.csv', '\ufeff' + toCSV(a.records, a.columns), 'text/csv;charset=utf-8');
  showToast('Processed CSV exported.');
});
$('#export-report').addEventListener('click', () => {
  if (!state.analysis) { showToast('Run an analysis before exporting.', 'error'); return; }
  const {records, preview, ...report} = state.analysis;
  report.preview = preview;
  report.generated_at = new Date().toISOString();
  downloadBlob('recordlab-summary-report.json', JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
  showToast('Summary report exported.');
});
const dropZone = $('#drop-zone');
['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', (event) => loadFile(event.dataTransfer.files[0]));

// Load a demo as soon as the page opens; the calculations happen in Python.
analyzeCurrent();

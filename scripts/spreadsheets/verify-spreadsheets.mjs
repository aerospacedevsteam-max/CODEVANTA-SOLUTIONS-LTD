#!/usr/bin/env node
// Verifies the generated spreadsheets by re-reading the .xlsx files with exceljs,
// recalculating every formula with HyperFormula (dev-time tool only, not shipped)
// and comparing the results with values computed independently in plain JS from
// the data actually stored in the files.
//
// Run after the build: `node scripts/spreadsheets/verify-spreadsheets.mjs`

import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';
import {
  FINANCE_PATH,
  FREELANCE_PATH,
  FIN,
  OV,
  METRICS,
  TASK_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
} from './build-spreadsheets.mjs';
import { workbookToHyperFormula, findErrors, valueAt, setAt, dateToSerial } from './lib/hf-workbook.mjs';

const FIRST = 5;
const LAST = 1000;
const EPS = 1e-9;
let checks = 0;

function near(actual, expected, msg) {
  checks += 1;
  assert.equal(typeof actual, 'number', `${msg}: expected a number, got ${JSON.stringify(actual)}`);
  assert.ok(Math.abs(actual - expected) < EPS, `${msg}: got ${actual}, expected ${expected}`);
}
function same(actual, expected, msg) {
  checks += 1;
  assert.equal(actual, expected, msg);
}
function noErrors(hf, formulaCells, label) {
  const errors = findErrors(hf, formulaCells);
  checks += 1;
  assert.deepEqual(errors, [], `${label}: formula errors found:\n${errors.join('\n')}`);
}
const serialOf = (y, m0, day) => dateToSerial(new Date(Date.UTC(y, m0, day)));
const iso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return serialOf(y, m - 1, d);
};
const plain = (v) => (v && typeof v === 'object' && v.richText ? v.richText.map((t) => t.text).join('') : v);

/** exceljs does not read calcPr back, so inspect workbook.xml directly. */
async function fullCalcOnLoad(file) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const xml = await zip.file('xl/workbook.xml').async('string');
  return /<calcPr[^>]*fullCalcOnLoad="1"/.test(xml);
}

async function load(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  return wb;
}

/** Compare cached results stored in the file with the HyperFormula recalculation. */
function checkCachedResults(hf, formulaCells, label) {
  let compared = 0;
  for (const fc of formulaCells) {
    const sheet = hf.getSheetId(fc.sheet);
    const calc = hf.getCellValue({ sheet, row: fc.row, col: fc.col });
    let cached = fc.cell.result;
    if (cached instanceof Date) cached = dateToSerial(cached);
    if (cached === undefined || cached === null) {
      // exceljs omits empty-string and zero results when reading back
      assert.ok(calc === '' || calc === 0 || calc === null, `${label} ${fc.sheet}!${fc.address}: missing cached result for ${calc}`);
    } else if (typeof calc === 'number') {
      assert.ok(Math.abs(cached - calc) < 1e-6, `${label} ${fc.sheet}!${fc.address}: cached ${cached} vs recalculated ${calc}`);
    } else {
      assert.equal(cached, calc, `${label} ${fc.sheet}!${fc.address}: cached vs recalculated`);
    }
    compared += 1;
  }
  checks += 1;
  return compared;
}

// ============================================================== FINANCE ==

function readFinanceData(wb) {
  const settings = wb.getWorksheet('Settings');
  const cats = (col) => {
    const list = [];
    for (let r = FIN.catFirstRow; r <= FIN.catLastRow; r += 1) {
      const v = plain(settings.getCell(`${col}${r}`).value);
      list.push(v === null || v === undefined || v === '' ? null : String(v));
    }
    return list;
  };
  const rows = (name, extra) => {
    const ws = wb.getWorksheet(name);
    const out = [];
    for (let r = FIRST; r <= LAST; r += 1) {
      const date = ws.getCell(`A${r}`).value;
      if (!(date instanceof Date)) continue;
      out.push({
        row: r,
        date: dateToSerial(date),
        category: plain(ws.getCell(`C${r}`).value),
        description: plain(ws.getCell(`D${r}`).value),
        amount: ws.getCell(`E${r}`).value,
        ...extra(ws, r),
      });
    }
    return out;
  };
  return {
    startMonth: settings.getCell(FIN.fyStartMonth).value,
    startYear: settings.getCell(FIN.fyStartYear).value,
    incomeCategories: cats(FIN.incomeCatCol),
    expenseCategories: cats(FIN.expenseCatCol),
    income: rows('Income', (ws, r) => ({ notes: plain(ws.getCell(`G${r}`).value) })),
    expenses: rows('Expenses', (ws, r) => ({ deductible: plain(ws.getCell(`F${r}`).value) })),
  };
}

/** Independent plain-JS model of every summary figure. */
function computeFinance(data) {
  const { startMonth, startYear } = data;
  const fyStart = serialOf(startYear, startMonth - 1, 1);
  const fyEnd = serialOf(startYear, startMonth - 1 + 12, 1) - 1;
  const months = [];
  for (let i = 0; i < 12; i += 1) {
    const from = serialOf(startYear, startMonth - 1 + i, 1);
    const to = serialOf(startYear, startMonth - 1 + i + 1, 1);
    const sum = (list) => list.filter((x) => x.date >= from && x.date < to).reduce((a, x) => a + x.amount, 0);
    months.push({ start: from, income: sum(data.income), expenses: sum(data.expenses) });
  }
  let cum = 0;
  for (const m of months) {
    m.net = m.income - m.expenses;
    cum += m.net;
    m.cumulative = cum;
  }
  const inFY = (x) => x.date >= fyStart && x.date <= fyEnd;
  const totalIncome = data.income.filter(inFY).reduce((a, x) => a + x.amount, 0);
  const totalExpenses = data.expenses.filter(inFY).reduce((a, x) => a + x.amount, 0);
  const byCategory = (list, cats) =>
    cats.map((c) => (c === null ? null : list.filter((x) => inFY(x) && x.category === c).reduce((a, x) => a + x.amount, 0)));
  const incomeByCat = byCategory(data.income, data.incomeCategories);
  const expenseByCat = byCategory(data.expenses, data.expenseCategories);
  const sumNonNull = (arr) => arr.reduce((a, x) => a + (x ?? 0), 0);
  const nets = months.map((m) => m.net);
  const best = months[nets.indexOf(Math.max(...nets))];
  const worst = months[nets.indexOf(Math.min(...nets))];
  const outside = [...data.income, ...data.expenses].filter((x) => !inFY(x)).length;
  return {
    fyStart,
    fyEnd,
    months,
    totalIncome,
    totalExpenses,
    incomeByCat,
    expenseByCat,
    incomeUncat: totalIncome - sumNonNull(incomeByCat),
    expenseUncat: totalExpenses - sumNonNull(expenseByCat),
    best,
    worst,
    deductible: data.expenses.filter((x) => inFY(x) && x.deductible === 'Y').reduce((a, x) => a + x.amount, 0),
    incomeCount: data.income.filter(inFY).length,
    expenseCount: data.expenses.filter(inFY).length,
    outside,
  };
}

function assertFinance(hf, data, label) {
  const e = computeFinance(data);
  const v = (sheet, addr) => valueAt(hf, sheet, addr);
  near(v('Settings', FIN.fyStart), e.fyStart, `${label} FY start`);
  near(v('Settings', FIN.fyEnd), e.fyEnd, `${label} FY end`);
  // Monthly Summary
  e.months.forEach((m, i) => {
    const r = FIN.monthFirstRow + i;
    near(v('Monthly Summary', `A${r}`), m.start, `${label} month ${i + 1} start`);
    near(v('Monthly Summary', `B${r}`), m.income, `${label} month ${i + 1} income`);
    near(v('Monthly Summary', `C${r}`), m.expenses, `${label} month ${i + 1} expenses`);
    near(v('Monthly Summary', `D${r}`), m.net, `${label} month ${i + 1} net`);
    near(v('Monthly Summary', `E${r}`), m.cumulative, `${label} month ${i + 1} cumulative`);
  });
  const t = FIN.monthTotalRow;
  near(v('Monthly Summary', `B${t}`), e.totalIncome, `${label} monthly total income = FY income`);
  near(v('Monthly Summary', `C${t}`), e.totalExpenses, `${label} monthly total expenses = FY expenses`);
  near(v('Monthly Summary', `D${t}`), e.totalIncome - e.totalExpenses, `${label} monthly total net`);
  // Category Summary
  const slots = FIN.catLastRow - FIN.catFirstRow + 1;
  const totalRow = 4 + slots + 2;
  const uncatRow = totalRow - 1;
  for (let i = 0; i < slots; i += 1) {
    const r = 5 + i;
    for (const [nameCol, valCol, pctCol, cats, totals, total] of [
      ['A', 'B', 'C', data.incomeCategories, e.incomeByCat, e.totalIncome],
      ['E', 'F', 'G', data.expenseCategories, e.expenseByCat, e.totalExpenses],
    ]) {
      if (cats[i] === null) {
        same(v('Category Summary', `${nameCol}${r}`), '', `${label} empty category slot ${nameCol}${r}`);
        same(v('Category Summary', `${valCol}${r}`), '', `${label} empty category total ${valCol}${r}`);
      } else {
        same(v('Category Summary', `${nameCol}${r}`), cats[i], `${label} category name ${nameCol}${r}`);
        near(v('Category Summary', `${valCol}${r}`), totals[i], `${label} category total ${cats[i]}`);
        near(v('Category Summary', `${pctCol}${r}`), total === 0 ? 0 : totals[i] / total, `${label} category % ${cats[i]}`);
      }
    }
  }
  near(v('Category Summary', `B${uncatRow}`), e.incomeUncat, `${label} uncategorised income`);
  near(v('Category Summary', `F${uncatRow}`), e.expenseUncat, `${label} uncategorised expenses`);
  near(v('Category Summary', `B${totalRow}`), e.totalIncome, `${label} category total income`);
  near(v('Category Summary', `F${totalRow}`), e.totalExpenses, `${label} category total expenses`);
  // Dashboard
  const net = e.totalIncome - e.totalExpenses;
  near(v('Dashboard', 'B5'), e.totalIncome, `${label} dashboard income`);
  near(v('Dashboard', 'B6'), e.totalExpenses, `${label} dashboard expenses`);
  near(v('Dashboard', 'B7'), net, `${label} dashboard net`);
  near(v('Dashboard', 'B8'), e.totalIncome === 0 ? 0 : e.totalExpenses / e.totalIncome, `${label} expense ratio`);
  near(v('Dashboard', 'B9'), e.totalIncome === 0 ? 0 : net / e.totalIncome, `${label} profit margin`);
  near(v('Dashboard', 'B10'), net / 12, `${label} average monthly net`);
  near(v('Dashboard', 'B11'), e.best.start, `${label} best month`);
  near(v('Dashboard', 'C11'), e.best.net, `${label} best month net`);
  near(v('Dashboard', 'B12'), e.worst.start, `${label} worst month`);
  near(v('Dashboard', 'C12'), e.worst.net, `${label} worst month net`);
  near(v('Dashboard', 'B13'), e.deductible, `${label} tax-deductible expenses`);
  near(v('Dashboard', 'B14'), e.incomeCount, `${label} income entries`);
  near(v('Dashboard', 'B15'), e.expenseCount, `${label} expense entries`);
  near(v('Dashboard', 'B16'), e.outside, `${label} entries outside FY`);
  const scale = Math.max(...e.months.map((m) => Math.max(m.income, m.expenses)));
  near(v('Dashboard', 'G4'), scale, `${label} bar scale`);
  e.months.forEach((m, i) => {
    const r = 20 + i;
    const bar = (x) => (scale <= 0 ? '' : '█'.repeat(Math.max(0, Math.round((x / scale) * 30))));
    same(v('Dashboard', `C${r}`), bar(m.income), `${label} income bar ${i + 1}`);
    same(v('Dashboard', `E${r}`), bar(m.expenses), `${label} expense bar ${i + 1}`);
  });
  return e;
}

async function verifyFinance() {
  const wb = await load(FINANCE_PATH);
  same(await fullCalcOnLoad(FINANCE_PATH), true, 'finance fullCalcOnLoad');
  same(
    wb.worksheets.map((w) => w.name).join('|'),
    'Start Here|Dashboard|Settings|Income|Expenses|Monthly Summary|Category Summary',
    'finance sheet names',
  );
  same(wb.getWorksheet('Income').getTable('IncomeTable') !== undefined, true, 'Income is an Excel table');
  same(wb.getWorksheet('Expenses').getTable('ExpensesTable') !== undefined, true, 'Expenses is an Excel table');
  const data = readFinanceData(wb);
  same(data.income.length, 15, 'finance: 15 sample income rows');
  same(data.expenses.length, 15, 'finance: 15 sample expense rows');
  for (const x of [...data.income, ...data.expenses]) {
    assert.ok(String(x.description).startsWith('SAMPLE'), `sample row ${x.row} is labelled SAMPLE`);
  }
  const { hf, formulaCells } = workbookToHyperFormula(wb);
  noErrors(hf, formulaCells, 'finance (as shipped)');
  const cached = checkCachedResults(hf, formulaCells, 'finance');
  const e = assertFinance(hf, data, 'finance (as shipped)');
  assert.ok(e.totalIncome > 0 && e.totalExpenses > 0 && e.outside === 0, 'finance sample data sits inside FY');

  // Scenario 1: financial year starting in July -> April-June sample rows fall outside.
  setAt(hf, 'Settings', FIN.fyStartMonth, 7);
  const july = { ...data, startMonth: 7 };
  const ej = assertFinance(hf, july, 'finance (FY starts July)');
  assert.ok(ej.outside > 0, 'July FY excludes earlier sample rows');
  noErrors(hf, formulaCells, 'finance (FY starts July)');
  setAt(hf, 'Settings', FIN.fyStartMonth, data.startMonth);

  // Scenario 2: FY starting in January of the following year (all sample data outside).
  setAt(hf, 'Settings', FIN.fyStartMonth, 1);
  setAt(hf, 'Settings', FIN.fyStartYear, data.startYear + 1);
  assertFinance(hf, { ...data, startMonth: 1, startYear: data.startYear + 1 }, 'finance (empty FY)');
  noErrors(hf, formulaCells, 'finance (empty FY)');
  setAt(hf, 'Settings', FIN.fyStartMonth, data.startMonth);
  setAt(hf, 'Settings', FIN.fyStartYear, data.startYear);

  // Scenario 3: a new row added under the table with a category not on Settings,
  // plus a new category added to the Settings list.
  const newRow = FIRST + data.income.length;
  const added = { row: newRow, date: iso('2026-12-03'), category: 'Grants', description: 'test', amount: 1234.56 };
  hf.setCellContents({ sheet: hf.getSheetId('Income'), row: newRow - 1, col: 0 }, [[added.date, 'Test', added.category, 'test', added.amount]]);
  const s3 = { ...data, income: [...data.income, added] };
  const e3 = assertFinance(hf, s3, 'finance (uncategorised row)');
  near(e3.incomeUncat, 1234.56, 'uncategorised picks up unknown category');
  const freeSlot = data.incomeCategories.indexOf(null);
  setAt(hf, 'Settings', `${FIN.incomeCatCol}${FIN.catFirstRow + freeSlot}`, 'Grants');
  const cats = [...data.incomeCategories];
  cats[freeSlot] = 'Grants';
  const e3b = assertFinance(hf, { ...s3, incomeCategories: cats }, 'finance (new category)');
  near(e3b.incomeUncat, 0, 'new category absorbs uncategorised amount');

  // Scenario 4: all sample rows deleted -> everything zero, no errors (e.g. no #DIV/0!).
  for (const name of ['Income', 'Expenses']) {
    const sheet = hf.getSheetId(name);
    const blank = Array.from({ length: 40 }, () => Array(7).fill(null));
    hf.setCellContents({ sheet, row: FIRST - 1, col: 0 }, blank);
  }
  setAt(hf, 'Settings', `${FIN.incomeCatCol}${FIN.catFirstRow + freeSlot}`, null);
  noErrors(hf, formulaCells, 'finance (no data)');
  assertFinance(hf, { ...data, income: [], expenses: [] }, 'finance (no data)');
  hf.destroy();
  console.log(`PASS finance tracker: ${formulaCells.length} formulas, 0 errors, ${cached} cached results match, 6 scenarios checked`);
}

// ============================================================ FREELANCE ==

function readFreelanceData(wb) {
  const read = (name, cols, keep) => {
    const ws = wb.getWorksheet(name);
    const out = [];
    for (let r = FIRST; r <= LAST; r += 1) {
      const first = plain(ws.getCell(`A${r}`).value);
      if (first === null || first === undefined || first === '') continue;
      const rec = { row: r };
      for (const [key, col] of Object.entries(cols)) {
        let val = plain(ws.getCell(`${col}${r}`).value);
        if (val instanceof Date) val = dateToSerial(val);
        rec[key] = val ?? null;
      }
      if (!keep || keep(rec)) out.push(rec);
    }
    return out;
  };
  return {
    clients: read('Clients', { id: 'A', name: 'B' }),
    projects: read('Projects', { id: 'A', name: 'B', clientId: 'C', start: 'E', deadline: 'F', budget: 'G', status: 'H', priority: 'I' }),
    tasks: read('Tasks', { task: 'A', projectId: 'B', status: 'D', priority: 'E', due: 'F', done: 'G' }),
  };
}

function computeFreelance(data, reportDate, windowDays) {
  const { tasks, projects, clients } = data;
  const isOpenTask = (t) => t.status !== 'Done';
  const isOpenProject = (p) => p.status !== 'Completed' && p.status !== 'Cancelled';
  const daysOverdue = (t) => (t.due === null ? '' : t.status === 'Done' ? 0 : Math.max(0, reportDate - t.due));
  const projectRows = projects.map((p) => {
    const own = tasks.filter((t) => t.projectId === p.id);
    const done = own.filter((t) => t.status === 'Done').length;
    const client = clients.find((c) => c.id === p.clientId);
    return {
      ...p,
      clientName: p.clientId === null ? '' : client ? client.name : 'Unknown client ID',
      pct: own.length === 0 ? 0 : done / own.length,
      daysToDeadline: p.deadline === null ? '' : p.deadline - reportDate,
    };
  });
  const openProjects = projectRows.filter(isOpenProject);
  const metrics = {
    totalTasks: tasks.length,
    openTasks: tasks.filter(isOpenTask).length,
    overdueTasks: tasks.filter((t) => isOpenTask(t) && t.due !== null && t.due < reportDate).length,
    tasksDueSoon: tasks.filter((t) => isOpenTask(t) && t.due !== null && t.due >= reportDate && t.due <= reportDate + windowDays).length,
    mostOverdueDays: Math.max(0, ...tasks.map(daysOverdue).filter((x) => typeof x === 'number')),
    tasksDoneRecently: tasks.filter((t) => t.status === 'Done' && t.done !== null && t.done >= reportDate - windowDays && t.done <= reportDate).length,
    openProjects: openProjects.length,
    overdueProjects: openProjects.filter((p) => p.deadline !== null && p.deadline < reportDate).length,
    projectDeadlinesSoon: openProjects.filter((p) => p.deadline !== null && p.deadline >= reportDate && p.deadline <= reportDate + windowDays).length,
    openBudget: openProjects.reduce((a, p) => a + (typeof p.budget === 'number' ? p.budget : 0), 0),
    avgOpenCompletion: openProjects.length === 0 ? 0 : openProjects.reduce((a, p) => a + p.pct, 0) / openProjects.length,
  };
  return {
    projectRows,
    taskOverdue: tasks.map(daysOverdue),
    byTaskStatus: TASK_STATUSES.map((s) => tasks.filter((t) => t.status === s).length),
    byTaskPriorityAll: PRIORITIES.map((p) => tasks.filter((t) => t.priority === p).length),
    byTaskPriorityOpen: PRIORITIES.map((p) => tasks.filter((t) => t.priority === p && isOpenTask(t)).length),
    byProjectStatus: PROJECT_STATUSES.map((s) => projects.filter((p) => p.status === s).length),
    byProjectPriorityAll: PRIORITIES.map((p) => projects.filter((x) => x.priority === p).length),
    byProjectPriorityOpen: PRIORITIES.map((p) => projects.filter((x) => x.priority === p && isOpenProject(x)).length),
    metrics,
  };
}

function assertFreelance(hf, data, reportDate, windowDays, label) {
  setAt(hf, 'Overview', OV.reportDate, reportDate);
  setAt(hf, 'Overview', OV.windowDays, windowDays);
  const e = computeFreelance(data, reportDate, windowDays);
  const v = (sheet, addr) => valueAt(hf, sheet, addr);
  e.projectRows.forEach((p) => {
    same(v('Projects', `D${p.row}`), p.clientName, `${label} client name ${p.id}`);
    near(v('Projects', `J${p.row}`), p.pct, `${label} % complete ${p.id}`);
    near(v('Projects', `K${p.row}`), p.daysToDeadline, `${label} days to deadline ${p.id}`);
  });
  data.tasks.forEach((t, i) => {
    const got = v('Tasks', `H${t.row}`);
    if (e.taskOverdue[i] === '') same(got, '', `${label} days overdue blank row ${t.row}`);
    else near(got, e.taskOverdue[i], `${label} days overdue row ${t.row} (${t.task})`);
  });
  const m = e.metrics;
  const totalTasks = m.totalTasks;
  TASK_STATUSES.forEach((s, i) => {
    const r = OV.taskStatusRow + i;
    same(v('Overview', `A${r}`), s, `${label} status label ${s}`);
    near(v('Overview', `B${r}`), e.byTaskStatus[i], `${label} tasks with status ${s}`);
    near(v('Overview', `C${r}`), totalTasks === 0 ? 0 : e.byTaskStatus[i] / totalTasks, `${label} share ${s}`);
  });
  PRIORITIES.forEach((p, i) => {
    const r = OV.taskPriorityRow + i;
    near(v('Overview', `B${r}`), e.byTaskPriorityAll[i], `${label} tasks priority ${p} (all)`);
    near(v('Overview', `C${r}`), e.byTaskPriorityOpen[i], `${label} tasks priority ${p} (open)`);
    near(v('Overview', `F${OV.projPriorityRow + i}`), e.byProjectPriorityAll[i], `${label} projects priority ${p} (all)`);
    near(v('Overview', `G${OV.projPriorityRow + i}`), e.byProjectPriorityOpen[i], `${label} projects priority ${p} (open)`);
  });
  PROJECT_STATUSES.forEach((s, i) => {
    near(v('Overview', `F${OV.projStatusRow + i}`), e.byProjectStatus[i], `${label} projects with status ${s}`);
  });
  METRICS.forEach((key, i) => {
    near(v('Overview', `B${OV.metricsRow + i}`), m[key], `${label} metric ${key}`);
  });
  return e;
}

async function verifyFreelance() {
  const wb = await load(FREELANCE_PATH);
  same(await fullCalcOnLoad(FREELANCE_PATH), true, 'freelance fullCalcOnLoad');
  same(wb.worksheets.map((w) => w.name).join('|'), 'Start Here|Overview|Clients|Projects|Tasks', 'freelance sheet names');
  for (const [sheet, table] of [
    ['Clients', 'ClientsTable'],
    ['Projects', 'ProjectsTable'],
    ['Tasks', 'TasksTable'],
  ]) {
    same(wb.getWorksheet(sheet).getTable(table) !== undefined, true, `${sheet} is an Excel table`);
  }
  same(wb.getWorksheet('Overview').getCell(OV.reportDate).formula, 'TODAY()', 'report date defaults to =TODAY()');
  const data = readFreelanceData(wb);
  assert.ok(data.clients.length >= 5 && data.projects.length >= 5 && data.tasks.length >= 15, 'sample data present');
  for (const c of data.clients) assert.ok(String(c.name).endsWith('(sample)'), `client ${c.id} labelled sample`);
  for (const p of data.projects) assert.ok(String(p.name).endsWith('(sample)'), `project ${p.id} labelled sample`);
  for (const t of data.tasks) assert.ok(String(t.task).endsWith('(sample)'), `task row ${t.row} labelled sample`);

  const { hf, formulaCells } = workbookToHyperFormula(wb);
  noErrors(hf, formulaCells, 'freelance (report date = TODAY())');

  // Cached values were computed on the build date: pin the report date to that
  // cached value, then every cached result must equal the recalculation.
  const cachedReportDate = formulaCells.find((fc) => fc.sheet === 'Overview' && fc.address === OV.reportDate).cell.result;
  const cachedSerial = cachedReportDate instanceof Date ? dateToSerial(cachedReportDate) : cachedReportDate;
  setAt(hf, 'Overview', OV.reportDate, cachedSerial);
  const cached = checkCachedResults(
    hf,
    formulaCells.filter((fc) => !(fc.sheet === 'Overview' && fc.address === OV.reportDate)),
    'freelance',
  );

  // Fixed report dates (the verification overrides =TODAY()).
  const fixed = [
    ['2026-11-02', 14],
    ['2026-10-15', 14],
    ['2026-12-20', 14],
    ['2026-11-02', 7],
    ['2026-09-01', 30],
  ];
  const seen = { overdue: 0, upcoming: 0, projectSoon: 0, projectOverdue: 0 };
  for (const [date, win] of fixed) {
    const e = assertFreelance(hf, data, iso(date), win, `freelance @${date}/${win}d`);
    noErrors(hf, formulaCells, `freelance @${date}`);
    seen.overdue += e.metrics.overdueTasks;
    seen.upcoming += e.metrics.tasksDueSoon;
    seen.projectSoon += e.metrics.projectDeadlinesSoon;
    seen.projectOverdue += e.metrics.overdueProjects;
  }
  assert.ok(seen.overdue > 0 && seen.upcoming > 0 && seen.projectSoon > 0 && seen.projectOverdue > 0, 'fixed dates exercise non-zero overdue/upcoming counts');

  // Specific expectation at 2026-11-02 (hand-checked against the sample rows).
  const at = computeFreelance(data, iso('2026-11-02'), 14).metrics;
  assert.deepEqual(
    { overdue: at.overdueTasks, dueSoon: at.tasksDueSoon, projSoon: at.projectDeadlinesSoon, projOverdue: at.overdueProjects },
    { overdue: 5, dueSoon: 4, projSoon: 2, projOverdue: 1 },
    'hand-checked counts at 2026-11-02',
  );
  checks += 1;
  setAt(hf, 'Overview', OV.reportDate, iso('2026-11-02'));
  setAt(hf, 'Overview', OV.windowDays, 14);
  near(valueAt(hf, 'Overview', `B${OV.metricsRow + METRICS.indexOf('overdueTasks')}`), 5, 'overdue tasks @2026-11-02');
  near(valueAt(hf, 'Overview', `B${OV.metricsRow + METRICS.indexOf('tasksDueSoon')}`), 4, 'tasks due soon @2026-11-02');

  // Scenario: new project for an unknown client and a project with no tasks.
  const pRow = FIRST + data.projects.length;
  hf.setCellContents({ sheet: hf.getSheetId('Projects'), row: pRow - 1, col: 0 }, [['P-900', 'Test', 'C-999']]);
  hf.setCellContents({ sheet: hf.getSheetId('Projects'), row: pRow - 1, col: 4 }, [[iso('2026-11-01'), iso('2026-11-05'), 100, 'Active', 'Low']]);
  const withProject = {
    ...data,
    projects: [...data.projects, { row: pRow, id: 'P-900', name: 'Test', clientId: 'C-999', start: iso('2026-11-01'), deadline: iso('2026-11-05'), budget: 100, status: 'Active', priority: 'Low' }],
  };
  const e5 = assertFreelance(hf, withProject, iso('2026-11-02'), 14, 'freelance (new project)');
  same(e5.projectRows.at(-1).clientName, 'Unknown client ID', 'unknown client flagged');
  near(e5.projectRows.at(-1).pct, 0, 'project without tasks is 0%');
  noErrors(hf, formulaCells, 'freelance (new project)');

  // Scenario: all sample rows deleted -> zero counts and no errors.
  const clear = (name, rows, cols) => {
    const sheet = hf.getSheetId(name);
    for (const c of cols) hf.setCellContents({ sheet, row: FIRST - 1, col: c }, Array.from({ length: rows }, () => [null]));
  };
  clear('Tasks', 40, [0, 1, 2, 3, 4, 5, 6]);
  clear('Projects', 40, [0, 1, 2, 4, 5, 6, 7, 8]);
  clear('Clients', 40, [0, 1, 2, 3, 4]);
  noErrors(hf, formulaCells, 'freelance (no data)');
  assertFreelance(hf, { clients: [], projects: [], tasks: [] }, iso('2026-11-02'), 14, 'freelance (no data)');
  hf.destroy();
  console.log(`PASS freelance tracker: ${formulaCells.length} formulas, 0 errors, ${cached} cached results match, ${fixed.length} fixed report dates + 2 scenarios checked`);
}

try {
  await verifyFinance();
  await verifyFreelance();
  console.log(`ALL SPREADSHEET CHECKS PASSED (${checks} assertions)`);
} catch (err) {
  console.error('VERIFICATION FAILED');
  console.error(err);
  process.exit(1);
}


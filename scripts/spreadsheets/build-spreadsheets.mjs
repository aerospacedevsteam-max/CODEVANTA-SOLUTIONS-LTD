#!/usr/bin/env node
// Builds the two spreadsheet products:
//   product-sources/small-business-finance-tracker/Small-Business-Finance-Tracker.xlsx
//   product-sources/freelance-project-management-template/Freelance-Project-Tracker.xlsx
//
// Re-runnable: `node scripts/spreadsheets/build-spreadsheets.mjs`
// Then verify:  `node scripts/spreadsheets/verify-spreadsheets.mjs`
//
// Process: build each workbook with formulas only -> reload it -> recalculate
// every formula with HyperFormula (dev-time only) -> fail on any error value ->
// store the computed values as cached formula results -> set fullCalcOnLoad so
// Excel recalculates everything when the file is opened.

import ExcelJS from 'exceljs';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { workbookToHyperFormula, findErrors, DetailedCellError } from './lib/hf-workbook.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FINANCE_PATH = path.join(ROOT, 'product-sources', 'small-business-finance-tracker', 'Small-Business-Finance-Tracker.xlsx');
export const FREELANCE_PATH = path.join(ROOT, 'product-sources', 'freelance-project-management-template', 'Freelance-Project-Tracker.xlsx');

// Data rows used by every formula range. Header row is 4, data rows 5..1000.
const FIRST = 5;
const LAST = 1000;
const rng = (sheet, col) => `${sheet}!$${col}$${FIRST}:$${col}$${LAST}`;

// ---------------------------------------------------------------- styling --
const COLORS = {
  ink: 'FF1E293B',
  brand: 'FF1F4E5F',
  brandLight: 'FFE6F0F3',
  sample: 'FFB45309',
  formulaFill: 'FFF1F5F9',
  goodFill: 'FFDCFCE7',
  goodFont: 'FF166534',
  badFill: 'FFFEE2E2',
  badFont: 'FF991B1B',
  warnFill: 'FFFEF3C7',
  warnFont: 'FF92400E',
  infoFill: 'FFDBEAFE',
  infoFont: 'FF1E40AF',
  muted: 'FF64748B',
};
const FMT = {
  date: 'dd mmm yyyy',
  month: 'mmm yyyy',
  money: '#,##0.00;[Red]-#,##0.00',
  pct: '0.0%',
  int: '0',
};
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

function title(ws, text, sub) {
  ws.getCell('A1').value = text;
  ws.getCell('A1').font = { size: 16, bold: true, color: { argb: COLORS.brand } };
  ws.getRow(1).height = 24;
  if (sub !== undefined) {
    ws.getCell('A2').value = sub;
    ws.getCell('A2').font = { italic: true, color: { argb: COLORS.muted } };
  }
}

function sampleBanner(ws, text) {
  ws.getCell('A2').value = text;
  ws.getCell('A2').font = { bold: true, color: { argb: COLORS.sample } };
}

function headerRow(ws, rowNumber, labels, startCol = 1) {
  labels.forEach((label, i) => {
    const cell = ws.getRow(rowNumber).getCell(startCol + i);
    cell.value = label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = fill(COLORS.brand);
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
}

function widths(ws, list) {
  list.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
}

function freezeHeader(ws, ySplit = 4) {
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit, topLeftCell: `A${ySplit + 1}`, activeCell: `A${ySplit + 1}` }];
}

function landscape(ws) {
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function formula(ws, address, f, numFmt) {
  const cell = ws.getCell(address);
  cell.value = { formula: f };
  cell.fill = fill(COLORS.formulaFill);
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}

function label(ws, address, text, opts = {}) {
  const cell = ws.getCell(address);
  cell.value = text;
  if (opts.bold) cell.font = { bold: true };
  if (opts.section) {
    cell.font = { bold: true, size: 12, color: { argb: COLORS.brand } };
  }
  return cell;
}

function writeStartHere(ws, heading, lines) {
  ws.getColumn(1).width = 110;
  ws.getCell('A1').value = heading;
  ws.getCell('A1').font = { size: 18, bold: true, color: { argb: COLORS.brand } };
  let r = 3;
  for (const line of lines) {
    const cell = ws.getCell(`A${r}`);
    if (typeof line === 'string') {
      cell.value = line;
      cell.alignment = { wrapText: true, vertical: 'top' };
    } else {
      cell.value = line.text;
      cell.alignment = { wrapText: true, vertical: 'top' };
      if (line.h) cell.font = { bold: true, size: 13, color: { argb: COLORS.brand } };
      if (line.warn) cell.font = { bold: true, color: { argb: COLORS.sample } };
      if (line.muted) cell.font = { italic: true, color: { argb: COLORS.muted } };
    }
    r += 1;
  }
  ws.views = [{ showGridLines: false }];
}

const d = (iso) => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};

const listValidation = (formulae, promptTitle, prompt) => ({
  type: 'list',
  allowBlank: true,
  formulae: [formulae],
  showErrorMessage: true,
  errorStyle: 'stop',
  errorTitle: 'Choose from the list',
  error: 'Please pick a value from the drop-down list (edit the list on the Settings sheet).',
  showInputMessage: Boolean(prompt),
  promptTitle,
  prompt,
});

const COMPAT =
  'Built for Microsoft Excel 2016+ and compatible spreadsheet apps; formulas verified with an automated recalculation test.';

// ======================================================= FINANCE TRACKER ==

export const FINANCE_SAMPLE = {
  businessName: 'Your Business Name',
  currency: 'INR',
  fyStartMonth: 4,
  fyStartYear: 2026,
  incomeCategories: ['Client Projects', 'Retainers', 'Product Sales', 'Consulting', 'Workshops & Training', 'Other Income'],
  expenseCategories: [
    'Software & Subscriptions',
    'Equipment',
    'Office & Rent',
    'Travel',
    'Marketing',
    'Professional Fees',
    'Insurance',
    'Bank & Payment Fees',
    'Utilities & Phone',
    'Other Expenses',
  ],
  paymentMethods: ['Bank transfer', 'Card', 'Cash', 'Online payment', 'Cheque'],
  income: [
    ['2026-04-03', 'Maple & Finch Interiors', 'Client Projects', 'Website redesign - deposit', 1800, 'Bank transfer'],
    ['2026-04-21', 'Brightwater Dental', 'Retainers', 'April support retainer', 650, 'Bank transfer'],
    ['2026-05-06', 'Online shop', 'Product Sales', 'Template sales (May batch)', 245.5, 'Online payment'],
    ['2026-05-19', 'Maple & Finch Interiors', 'Client Projects', 'Website redesign - final balance', 2200, 'Bank transfer'],
    ['2026-05-21', 'Brightwater Dental', 'Retainers', 'May support retainer', 650, 'Bank transfer'],
    ['2026-06-10', 'Copperleaf Cafe', 'Consulting', 'Brand strategy workshop', 480, 'Card'],
    ['2026-06-22', 'Brightwater Dental', 'Retainers', 'June support retainer', 650, 'Bank transfer'],
    ['2026-07-08', 'Online shop', 'Product Sales', 'Template sales (July batch)', 312.75, 'Online payment'],
    ['2026-07-15', 'Northgate Community Library', 'Workshops & Training', 'Digital skills session', 900, 'Bank transfer'],
    ['2026-07-21', 'Brightwater Dental', 'Retainers', 'July support retainer', 650, 'Bank transfer'],
    ['2026-08-12', 'Fernhill Physio', 'Client Projects', 'Booking site build', 3100, 'Bank transfer'],
    ['2026-08-21', 'Brightwater Dental', 'Retainers', 'August support retainer', 650, 'Bank transfer'],
    ['2026-09-04', 'Online shop', 'Product Sales', 'Template sales (September batch)', 198.25, 'Online payment'],
    ['2026-09-18', 'Copperleaf Cafe', 'Consulting', 'Menu photography direction', 520, 'Cheque'],
    ['2026-10-02', 'Fernhill Physio', 'Client Projects', 'Booking site - phase 2', 1450, 'Bank transfer'],
  ],
  expenses: [
    ['2026-04-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-04-14', 'Pixelworks Hardware', 'Equipment', 'External monitor', 289, 'Y'],
    ['2026-05-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-05-09', 'Regional Rail', 'Travel', 'Client visit - return ticket', 46.8, 'Y'],
    ['2026-06-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-06-12', 'Lantern Print Studio', 'Marketing', 'Business cards', 85, 'Y'],
    ['2026-06-30', 'Harbour Co-working', 'Office & Rent', 'Desk rental (quarter)', 360, 'Y'],
    ['2026-07-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-07-19', 'Ledgerline Accountants', 'Professional Fees', 'Year-end accounts', 450, 'Y'],
    ['2026-08-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-08-15', 'Shieldwell Insurance', 'Insurance', 'Professional indemnity cover', 210, 'Y'],
    ['2026-09-01', 'CloudDesk Software', 'Software & Subscriptions', 'Design suite subscription', 54.99, 'Y'],
    ['2026-09-10', 'Corner Street Cafe', 'Other Expenses', 'Personal lunch (not deductible)', 38.5, 'N'],
    ['2026-09-30', 'Harbour Co-working', 'Office & Rent', 'Desk rental (quarter)', 360, 'Y'],
    ['2026-10-05', 'Merchant services provider', 'Bank & Payment Fees', 'Card processing fees', 12.4, 'Y'],
  ],
};

// Settings layout (exported so the verifier uses the same addresses).
export const FIN = {
  businessName: 'B4',
  currency: 'B5',
  fyStartMonth: 'B6',
  fyStartYear: 'B7',
  fyStart: 'B8',
  fyEnd: 'B9',
  catFirstRow: 13,
  catLastRow: 32, // 20 category slots
  incomeCatCol: 'A',
  expenseCatCol: 'C',
  paymentCol: 'E',
  monthFirstRow: 5, // Monthly Summary rows 5..16, total row 17
  monthTotalRow: 17,
};
const CAT_SLOTS = FIN.catLastRow - FIN.catFirstRow + 1;

function buildFinance() {
  const s = FINANCE_SAMPLE;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CODEVANTASOLUTIONSLTD';
  wb.title = 'Small Business Finance Tracker';
  wb.created = new Date(Date.UTC(2026, 0, 1));
  wb.modified = wb.created;

  // ---------------------------------------------------------- Start Here
  const start = wb.addWorksheet('Start Here', { properties: { tabColor: { argb: COLORS.brand } } });
  writeStartHere(start, 'Small Business Finance Tracker', [
    { text: 'Welcome! This workbook tracks one financial year of income and expenses and summarises it automatically.', muted: true },
    '',
    { text: 'Quick start', h: true },
    '1. Open "Settings" and enter your business name, a currency label (e.g. INR, USD, EUR), the month your financial year starts (1 = January ... 12 = December) and the calendar year it starts in.',
    '2. Still on "Settings", edit the income and expense category lists to match your business (up to 20 of each). Payment methods can be edited too.',
    '3. Delete the SAMPLE rows on "Income" and "Expenses" (see below), then record your own entries.',
    '4. "Monthly Summary", "Category Summary" and "Dashboard" update automatically. Do not type into the shaded formula cells.',
    '',
    { text: 'IMPORTANT - sample data', h: true },
    { text: `The ${s.income.length} income rows and ${s.expenses.length} expense rows supplied are fictional SAMPLE data (marked "SAMPLE" in the Notes / Description columns). Delete them before entering real figures.`, warn: true },
    'How to delete: on the Income sheet, select the sample rows inside the table, right-click and choose Delete > Table Rows. Repeat on the Expenses sheet. The table keeps its headers and formatting.',
    '',
    { text: 'Sheet guide', h: true },
    'Settings - business details, financial-year start, category lists and payment methods used by the drop-downs.',
    'Income - one row per payment received: date, client, category (drop-down), description, amount, payment method (drop-down), notes.',
    'Expenses - one row per cost: date, supplier, category (drop-down), description, amount, tax-deductible Y/N (drop-down).',
    'Monthly Summary - 12 months starting at your financial-year start month: income, expenses, net and cumulative net.',
    'Category Summary - totals and percentage share for each income and expense category within the financial year.',
    'Dashboard - key totals, expense ratio, profit margin, best and worst month, tax-deductible spend and a bar visual per month.',
    '',
    { text: 'Tips', h: true },
    '- Enter dates as real dates (e.g. 15/04/2026 or 2026-04-15), and amounts as positive numbers without currency symbols.',
    '- To add a row, type in the first empty row directly under a table - the table grows automatically. Summaries read rows 5 to 1000 on Income and Expenses.',
    '- Entries dated outside the selected financial year are not included in the summaries; the Dashboard shows how many there are.',
    '- Amounts that use a category not found on Settings are shown as "Uncategorised" on Category Summary, so totals always add up.',
    '- The currency label is only a label: the workbook does not convert currencies.',
    '- Start a new copy of the workbook for each financial year.',
    '',
    { text: 'Compatibility', h: true },
    COMPAT,
    'The workbook uses only standard functions (SUMIFS, COUNTIFS, INDEX, MATCH, DATE, REPT and similar) - no macros, no external links, no dynamic-array functions.',
    '',
    { text: 'This template is an organisational tool and is not accounting or tax advice. Check figures with a qualified adviser before filing returns.', muted: true },
  ]);

  // Dashboard is created now so it sits second in the tab order; filled in below.
  const db = wb.addWorksheet('Dashboard', { properties: { tabColor: { argb: 'FF16A34A' } } });

  // ------------------------------------------------------------ Settings
  const st = wb.addWorksheet('Settings');
  title(st, 'Settings', 'Edit the white cells. Shaded cells are calculated.');
  widths(st, [38, 26, 30, 4, 22]);
  label(st, 'A4', 'Business name', { bold: true });
  st.getCell(FIN.businessName).value = s.businessName;
  label(st, 'A5', 'Currency label', { bold: true });
  st.getCell(FIN.currency).value = s.currency;
  label(st, 'A6', 'Financial year start month (1-12)', { bold: true });
  st.getCell(FIN.fyStartMonth).value = s.fyStartMonth;
  st.getCell(FIN.fyStartMonth).dataValidation = {
    type: 'whole',
    operator: 'between',
    allowBlank: false,
    formulae: [1, 12],
    showErrorMessage: true,
    errorTitle: 'Month number',
    error: 'Enter a whole number from 1 (January) to 12 (December).',
  };
  label(st, 'A7', 'Financial year starts in (year)', { bold: true });
  st.getCell(FIN.fyStartYear).value = s.fyStartYear;
  st.getCell(FIN.fyStartYear).dataValidation = {
    type: 'whole',
    operator: 'between',
    allowBlank: false,
    formulae: [2000, 2100],
    showErrorMessage: true,
    errorTitle: 'Year',
    error: 'Enter a four-digit year, e.g. 2026.',
  };
  label(st, 'A8', 'Financial year begins', { bold: true });
  formula(st, FIN.fyStart, `DATE(${FIN.fyStartYear},${FIN.fyStartMonth},1)`, FMT.date);
  label(st, 'A9', 'Financial year ends', { bold: true });
  formula(st, FIN.fyEnd, `DATE(${FIN.fyStartYear},${FIN.fyStartMonth}+12,1)-1`, FMT.date);
  ['B4', 'B5', 'B6', 'B7'].forEach((a) => {
    st.getCell(a).border = { bottom: { style: 'thin', color: { argb: COLORS.muted } } };
  });

  headerRow(st, FIN.catFirstRow - 1, ['Income categories'], 1);
  headerRow(st, FIN.catFirstRow - 1, ['Expense categories'], 3);
  headerRow(st, FIN.catFirstRow - 1, ['Payment methods'], 5);
  label(st, 'A11', `Up to ${CAT_SLOTS} entries per list. Type over, add or clear cells - drop-downs and summaries follow.`).font = {
    italic: true,
    color: { argb: COLORS.muted },
  };
  for (let i = 0; i < CAT_SLOTS; i += 1) {
    const r = FIN.catFirstRow + i;
    st.getCell(`A${r}`).value = s.incomeCategories[i] ?? null;
    st.getCell(`C${r}`).value = s.expenseCategories[i] ?? null;
    st.getCell(`E${r}`).value = s.paymentMethods[i] ?? null;
    for (const col of ['A', 'C', 'E']) {
      st.getCell(`${col}${r}`).border = { bottom: { style: 'hair', color: { argb: 'FFCBD5E1' } } };
    }
  }

  const incomeCatList = `Settings!$A$${FIN.catFirstRow}:$A$${FIN.catLastRow}`;
  const expenseCatList = `Settings!$C$${FIN.catFirstRow}:$C$${FIN.catLastRow}`;
  const paymentList = `Settings!$E$${FIN.catFirstRow}:$E$${FIN.catLastRow}`;

  // -------------------------------------------------------------- Income
  const inc = wb.addWorksheet('Income');
  title(inc, 'Income');
  sampleBanner(
    inc,
    `SAMPLE DATA: rows 5-${4 + s.income.length} are fictional examples. Delete them (select rows > right-click > Delete > Table Rows) before entering real data.`,
  );
  widths(inc, [14, 28, 24, 40, 14, 18, 22]);
  inc.addTable({
    name: 'IncomeTable',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Date', 'Client', 'Category', 'Description', 'Amount', 'Payment method', 'Notes'].map((name) => ({ name, filterButton: true })),
    rows: s.income.map(([date, client, cat, desc, amount, method]) => [d(date), client, cat, `SAMPLE - ${desc}`, amount, method, 'SAMPLE - delete me']),
  });
  inc.getColumn('A').numFmt = FMT.date;
  inc.getColumn('E').numFmt = FMT.money;
  inc.dataValidations.add(`C${FIRST}:C${LAST}`, listValidation(incomeCatList, 'Category', 'Pick an income category (edit list on Settings).'));
  inc.dataValidations.add(`F${FIRST}:F${LAST}`, listValidation(paymentList, 'Payment method', 'Pick how you were paid.'));
  inc.dataValidations.add(`A${FIRST}:A${LAST}`, {
    type: 'date',
    operator: 'greaterThan',
    allowBlank: true,
    formulae: [new Date(Date.UTC(1999, 11, 31))],
    showErrorMessage: true,
    errorTitle: 'Date',
    error: 'Enter a valid date.',
  });
  inc.dataValidations.add(`E${FIRST}:E${LAST}`, {
    type: 'decimal',
    operator: 'greaterThanOrEqual',
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorTitle: 'Amount',
    error: 'Enter a positive number without a currency symbol.',
  });
  freezeHeader(inc);
  landscape(inc);

  // ------------------------------------------------------------ Expenses
  const exp = wb.addWorksheet('Expenses');
  title(exp, 'Expenses');
  sampleBanner(
    exp,
    `SAMPLE DATA: rows 5-${4 + s.expenses.length} are fictional examples. Delete them (select rows > right-click > Delete > Table Rows) before entering real data.`,
  );
  widths(exp, [14, 28, 26, 44, 14, 16]);
  exp.addTable({
    name: 'ExpensesTable',
    ref: 'A4',
    headerRow: true,
    totalsRow: false,
    style: { theme: 'TableStyleMedium4', showRowStripes: true },
    columns: ['Date', 'Supplier', 'Category', 'Description', 'Amount', 'Tax deductible (Y/N)'].map((name) => ({ name, filterButton: true })),
    rows: s.expenses.map(([date, supplier, cat, desc, amount, yn]) => [d(date), supplier, cat, `SAMPLE - ${desc}`, amount, yn]),
  });
  exp.getColumn('A').numFmt = FMT.date;
  exp.getColumn('E').numFmt = FMT.money;
  exp.dataValidations.add(`C${FIRST}:C${LAST}`, listValidation(expenseCatList, 'Category', 'Pick an expense category (edit list on Settings).'));
  exp.dataValidations.add(`F${FIRST}:F${LAST}`, listValidation('"Y,N"', 'Tax deductible?', 'Y = allowable business expense, N = not deductible.'));
  exp.dataValidations.add(`A${FIRST}:A${LAST}`, {
    type: 'date',
    operator: 'greaterThan',
    allowBlank: true,
    formulae: [new Date(Date.UTC(1999, 11, 31))],
    showErrorMessage: true,
    errorTitle: 'Date',
    error: 'Enter a valid date.',
  });
  exp.dataValidations.add(`E${FIRST}:E${LAST}`, {
    type: 'decimal',
    operator: 'greaterThanOrEqual',
    allowBlank: true,
    formulae: [0],
    showErrorMessage: true,
    errorTitle: 'Amount',
    error: 'Enter a positive number without a currency symbol.',
  });
  freezeHeader(exp);
  landscape(exp);

  const fyStart = `Settings!$${FIN.fyStart.replace(/(\d+)/, '$$$1')}`;
  const fyEnd = `Settings!$${FIN.fyEnd.replace(/(\d+)/, '$$$1')}`;
  const inFY = (sheet) => `${rng(sheet, 'A')},">="&${fyStart},${rng(sheet, 'A')},"<="&${fyEnd}`;

  // ----------------------------------------------------- Monthly Summary
  const ms = wb.addWorksheet('Monthly Summary');
  title(ms, 'Monthly Summary');
  formula(ms, 'A2', `"Amounts in "&Settings!$B$5&" - financial year"`).fill = undefined;
  formula(ms, 'B2', fyStart, FMT.date).fill = undefined;
  formula(ms, 'C2', fyEnd, '"to "dd mmm yyyy').fill = undefined;
  for (const a of ['A2', 'B2', 'C2']) ms.getCell(a).font = { italic: true, color: { argb: COLORS.muted } };
  widths(ms, [16, 16, 16, 16, 18]);
  headerRow(ms, 4, ['Month', 'Income', 'Expenses', 'Net', 'Cumulative net']);
  for (let i = 0; i < 12; i += 1) {
    const r = FIN.monthFirstRow + i;
    formula(ms, `A${r}`, `DATE(Settings!$B$7,Settings!$B$6+${i},1)`, FMT.month);
    const monthCrit = (sheet) =>
      `${rng(sheet, 'A')},">="&$A${r},${rng(sheet, 'A')},"<"&DATE(YEAR($A${r}),MONTH($A${r})+1,1)`;
    formula(ms, `B${r}`, `SUMIFS(${rng('Income', 'E')},${monthCrit('Income')})`, FMT.money);
    formula(ms, `C${r}`, `SUMIFS(${rng('Expenses', 'E')},${monthCrit('Expenses')})`, FMT.money);
    formula(ms, `D${r}`, `B${r}-C${r}`, FMT.money);
    formula(ms, `E${r}`, `SUM($D$${FIN.monthFirstRow}:D${r})`, FMT.money);
  }
  const t = FIN.monthTotalRow;
  label(ms, `A${t}`, 'Total', { bold: true });
  formula(ms, `B${t}`, `SUM(B${FIN.monthFirstRow}:B${t - 1})`, FMT.money).font = { bold: true };
  formula(ms, `C${t}`, `SUM(C${FIN.monthFirstRow}:C${t - 1})`, FMT.money).font = { bold: true };
  formula(ms, `D${t}`, `B${t}-C${t}`, FMT.money).font = { bold: true };
  for (const col of ['A', 'B', 'C', 'D', 'E']) {
    ms.getCell(`${col}${t}`).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  }
  ms.addConditionalFormatting({
    ref: `D${FIN.monthFirstRow}:E${t}`,
    rules: [
      { type: 'cellIs', operator: 'lessThan', formulae: [0], priority: 1, style: { font: { color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } },
      { type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 2, style: { font: { color: { argb: COLORS.goodFont } }, fill: fill(COLORS.goodFill) } },
    ],
  });
  freezeHeader(ms);

  // ---------------------------------------------------- Category Summary
  const cs = wb.addWorksheet('Category Summary');
  title(cs, 'Category Summary', 'Totals within the selected financial year. Categories come from the Settings sheet.');
  widths(cs, [28, 16, 14, 4, 28, 16, 14]);
  headerRow(cs, 4, ['Income category', 'Total', '% of income'], 1);
  headerRow(cs, 4, ['Expense category', 'Total', '% of expenses'], 5);
  const catEnd = 4 + CAT_SLOTS; // last category row (24)
  const uncatRow = catEnd + 1; // 25
  const totalRow = catEnd + 2; // 26
  for (let i = 0; i < CAT_SLOTS; i += 1) {
    const r = 5 + i;
    const sr = FIN.catFirstRow + i;
    formula(cs, `A${r}`, `IF(Settings!$A$${sr}="","",Settings!$A$${sr})`);
    formula(cs, `B${r}`, `IF($A${r}="","",SUMIFS(${rng('Income', 'E')},${rng('Income', 'C')},$A${r},${inFY('Income')}))`, FMT.money);
    formula(cs, `C${r}`, `IF($A${r}="","",IF($B$${totalRow}=0,0,B${r}/$B$${totalRow}))`, FMT.pct);
    formula(cs, `E${r}`, `IF(Settings!$C$${sr}="","",Settings!$C$${sr})`);
    formula(cs, `F${r}`, `IF($E${r}="","",SUMIFS(${rng('Expenses', 'E')},${rng('Expenses', 'C')},$E${r},${inFY('Expenses')}))`, FMT.money);
    formula(cs, `G${r}`, `IF($E${r}="","",IF($F$${totalRow}=0,0,F${r}/$F$${totalRow}))`, FMT.pct);
  }
  label(cs, `A${uncatRow}`, 'Uncategorised / other');
  formula(cs, `B${uncatRow}`, `B${totalRow}-SUM(B5:B${catEnd})`, FMT.money);
  formula(cs, `C${uncatRow}`, `IF($B$${totalRow}=0,0,B${uncatRow}/$B$${totalRow})`, FMT.pct);
  label(cs, `E${uncatRow}`, 'Uncategorised / other');
  formula(cs, `F${uncatRow}`, `F${totalRow}-SUM(F5:F${catEnd})`, FMT.money);
  formula(cs, `G${uncatRow}`, `IF($F$${totalRow}=0,0,F${uncatRow}/$F$${totalRow})`, FMT.pct);
  label(cs, `A${totalRow}`, 'Total income', { bold: true });
  formula(cs, `B${totalRow}`, `SUMIFS(${rng('Income', 'E')},${inFY('Income')})`, FMT.money).font = { bold: true };
  formula(cs, `C${totalRow}`, `IF($B$${totalRow}=0,0,1)`, FMT.pct);
  label(cs, `E${totalRow}`, 'Total expenses', { bold: true });
  formula(cs, `F${totalRow}`, `SUMIFS(${rng('Expenses', 'E')},${inFY('Expenses')})`, FMT.money).font = { bold: true };
  formula(cs, `G${totalRow}`, `IF($F$${totalRow}=0,0,1)`, FMT.pct);
  for (const col of ['A', 'B', 'C', 'E', 'F', 'G']) {
    cs.getCell(`${col}${totalRow}`).border = { top: { style: 'thin' }, bottom: { style: 'double' } };
  }
  cs.addConditionalFormatting({
    ref: `C5:C${catEnd} G5:G${catEnd}`,
    rules: [{ type: 'dataBar', priority: 1, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: 'FF5B9BD5' }, gradient: false }],
  });
  cs.addConditionalFormatting({
    ref: `B${uncatRow}:C${uncatRow} F${uncatRow}:G${uncatRow}`,
    rules: [{ type: 'cellIs', operator: 'notEqual', formulae: [0], priority: 2, style: { font: { color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } }],
  });
  freezeHeader(cs);

  // ----------------------------------------------------------- Dashboard
  db.views = [{ showGridLines: false }];
  widths(db, [36, 16, 34, 16, 34]);
  formula(db, 'A1', `IF(Settings!$B$4="","Dashboard",Settings!$B$4&" - Dashboard")`).fill = undefined;
  db.getCell('A1').font = { size: 18, bold: true, color: { argb: COLORS.brand } };
  formula(db, 'A2', `"Amounts in "&Settings!$B$5&" - financial year"`).fill = undefined;
  formula(db, 'B2', fyStart, FMT.date).fill = undefined;
  formula(db, 'C2', fyEnd, '"to "dd mmm yyyy').fill = undefined;
  for (const a of ['A2', 'B2', 'C2']) db.getCell(a).font = { italic: true, color: { argb: COLORS.muted } };

  const MSm = `'Monthly Summary'!$A$${FIN.monthFirstRow}:$A$${t - 1}`;
  const MSi = `'Monthly Summary'!$B$${FIN.monthFirstRow}:$B$${t - 1}`;
  const MSe = `'Monthly Summary'!$C$${FIN.monthFirstRow}:$C$${t - 1}`;
  const MSn = `'Monthly Summary'!$D$${FIN.monthFirstRow}:$D$${t - 1}`;
  headerRow(db, 4, ['Key figures', 'Value', 'Detail']);
  const kpis = [
    ['Total income', `'Monthly Summary'!$B$${t}`, FMT.money],
    ['Total expenses', `'Monthly Summary'!$C$${t}`, FMT.money],
    ['Net profit', `B5-B6`, FMT.money],
    ['Expense ratio (expenses / income)', `IF(B5=0,0,B6/B5)`, FMT.pct],
    ['Profit margin (net / income)', `IF(B5=0,0,B7/B5)`, FMT.pct],
    ['Average monthly net', `B7/12`, FMT.money],
    ['Best month (highest net)', `INDEX(${MSm},MATCH(MAX(${MSn}),${MSn},0))`, FMT.month, `MAX(${MSn})`],
    ['Worst month (lowest net)', `INDEX(${MSm},MATCH(MIN(${MSn}),${MSn},0))`, FMT.month, `MIN(${MSn})`],
    ['Tax-deductible expenses (Y)', `SUMIFS(${rng('Expenses', 'E')},${rng('Expenses', 'F')},"Y",${inFY('Expenses')})`, FMT.money],
    ['Number of income entries', `COUNTIFS(${inFY('Income')})`, FMT.int],
    ['Number of expense entries', `COUNTIFS(${inFY('Expenses')})`, FMT.int],
    [
      'Entries dated outside this financial year',
      `COUNTIFS(${rng('Income', 'A')},"<"&${fyStart})+COUNTIFS(${rng('Income', 'A')},">"&${fyEnd})+COUNTIFS(${rng('Expenses', 'A')},"<"&${fyStart})+COUNTIFS(${rng('Expenses', 'A')},">"&${fyEnd})`,
      FMT.int,
    ],
  ];
  kpis.forEach(([text, f, fmt, detail], i) => {
    const r = 5 + i;
    label(db, `A${r}`, text, { bold: true });
    formula(db, `B${r}`, f, fmt);
    if (detail) {
      formula(db, `C${r}`, detail, '"Net: "#,##0.00;[Red]"Net: "-#,##0.00');
    }
  });
  formula(db, 'C16', `IF(B16>0,"Check dates - these are excluded from all totals","All entries fall inside the year")`);
  db.addConditionalFormatting({
    ref: 'B7',
    rules: [
      { type: 'cellIs', operator: 'lessThan', formulae: [0], priority: 1, style: { font: { bold: true, color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } },
      { type: 'cellIs', operator: 'greaterThanOrEqual', formulae: [0], priority: 2, style: { font: { bold: true, color: { argb: COLORS.goodFont } }, fill: fill(COLORS.goodFill) } },
    ],
  });
  db.addConditionalFormatting({
    ref: 'B8',
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0.8], priority: 3, style: { font: { color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } }],
  });
  db.addConditionalFormatting({
    ref: 'B16:C16',
    rules: [{ type: 'expression', formulae: ['$B$16>0'], priority: 4, style: { font: { color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } }],
  });

  // Bar visual (formula-driven, works everywhere).
  const BAR = 30;
  const barTop = 19;
  label(db, `A${barTop - 1}`, 'Monthly income vs expenses (bar length scaled to the largest month)', { section: true });
  headerRow(db, barTop, ['Month', 'Income', 'Income bar', 'Expenses', 'Expenses bar']);
  formula(db, 'G4', `MAX(MAX(${MSi}),MAX(${MSe}))`, FMT.money);
  db.getCell('F4').value = 'Bar scale (largest month)';
  db.getCell('F4').font = { italic: true, color: { argb: COLORS.muted } };
  db.getColumn('F').width = 24;
  db.getColumn('G').width = 14;
  for (let i = 0; i < 12; i += 1) {
    const r = barTop + 1 + i;
    const mr = FIN.monthFirstRow + i;
    formula(db, `A${r}`, `'Monthly Summary'!$A$${mr}`, FMT.month);
    formula(db, `B${r}`, `'Monthly Summary'!$B$${mr}`, FMT.money);
    formula(db, `C${r}`, `IF($G$4<=0,"",REPT("█",MAX(0,ROUND(B${r}/$G$4*${BAR},0))))`).font = { color: { argb: 'FF16A34A' } };
    formula(db, `D${r}`, `'Monthly Summary'!$C$${mr}`, FMT.money);
    formula(db, `E${r}`, `IF($G$4<=0,"",REPT("█",MAX(0,ROUND(D${r}/$G$4*${BAR},0))))`).font = { color: { argb: 'FFDC2626' } };
  }
  landscape(db);

  return wb;
}

// ===================================================== FREELANCE TRACKER ==

export const FREELANCE_SAMPLE = {
  clients: [
    ['C-001', 'Maple & Finch Interiors', 'Jordan Ellery', 'jordan@maplefinch.example', 'Prefers email; invoices monthly'],
    ['C-002', 'Copperleaf Cafe', 'Priya Hollis', 'priya@copperleaf.example', 'Weekly check-in on Mondays'],
    ['C-003', 'Fernhill Physio', 'Marcus Dunmore', 'marcus@fernhill.example', 'Needs accessible booking flow'],
    ['C-004', 'Northgate Community Library', 'Ada Penrose', 'ada@northgate.example', 'Purchase order required'],
    ['C-005', 'Brightwater Dental', 'Leo Ashcombe', 'leo@brightwater.example', 'Retainer client'],
  ],
  projects: [
    ['P-001', 'Website refresh', 'C-001', '2026-09-01', '2026-11-10', 4200, 'Active', 'High'],
    ['P-002', 'Brand guidelines', 'C-002', '2026-09-15', '2026-10-30', 1800, 'Active', 'Urgent'],
    ['P-003', 'Booking app prototype', 'C-003', '2026-10-05', '2026-12-15', 6500, 'Active', 'Medium'],
    ['P-004', 'SEO audit', 'C-001', '2026-08-01', '2026-09-15', 900, 'Completed', 'Low'],
    ['P-005', 'Newsletter templates', 'C-004', '2026-10-20', '2026-11-14', 750, 'Planned', 'Medium'],
    ['P-006', 'Photo edits', 'C-005', '2026-07-10', '2026-08-30', 1200, 'Cancelled', 'Low'],
    ['P-007', 'Social media kit', 'C-002', '2026-11-01', '2026-12-05', 1400, 'On hold', 'High'],
  ],
  tasks: [
    ['Content audit', 'P-001', 'Me', 'Done', 'Medium', '2026-09-12', '2026-09-11'],
    ['Wireframes', 'P-001', 'Me', 'Done', 'High', '2026-09-26', '2026-09-29'],
    ['Homepage design', 'P-001', 'Sam (contractor)', 'In progress', 'High', '2026-10-20', null],
    ['Build page templates', 'P-001', 'Me', 'In progress', 'High', '2026-11-05', null],
    ['Launch checklist', 'P-001', 'Me', 'Not started', 'Medium', '2026-11-09', null],
    ['Moodboard', 'P-002', 'Me', 'Done', 'Medium', '2026-09-25', '2026-09-24'],
    ['Logo refinements', 'P-002', 'Alex (contractor)', 'Done', 'High', '2026-10-10', '2026-10-12'],
    ['Colour & type spec', 'P-002', 'Me', 'Blocked', 'Urgent', '2026-10-24', null],
    ['Guidelines PDF', 'P-002', 'Me', 'Not started', 'Urgent', '2026-10-29', null],
    ['Discovery call notes', 'P-003', 'Me', 'Done', 'Low', '2026-10-07', '2026-10-07'],
    ['User flows', 'P-003', 'Me', 'In progress', 'High', '2026-10-28', null],
    ['Clickable prototype', 'P-003', 'Sam (contractor)', 'Not started', 'High', '2026-11-20', null],
    ['Usability test', 'P-003', 'Me', 'Not started', 'Medium', '2026-12-04', null],
    ['Crawl report', 'P-004', 'Me', 'Done', 'Low', '2026-08-15', '2026-08-14'],
    ['Recommendations document', 'P-004', 'Me', 'Done', 'Medium', '2026-09-10', '2026-09-12'],
    ['Template wireframes', 'P-005', 'Me', 'Not started', 'Medium', '2026-11-04', null],
    ['Test sends', 'P-005', 'Me', 'Not started', 'Low', '2026-11-12', null],
    ['Select images', 'P-006', 'Me', 'Done', 'Low', '2026-07-20', '2026-07-20'],
    ['Content calendar', 'P-007', 'Alex (contractor)', 'Blocked', 'Medium', '2026-11-25', null],
    ['Template set', 'P-007', 'Me', 'Not started', 'High', '2026-12-02', null],
    ['Invoice final payment', 'P-004', 'Me', 'In progress', 'Urgent', '2026-10-16', null],
  ],
};

export const TASK_STATUSES = ['Not started', 'In progress', 'Blocked', 'Done'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const PROJECT_STATUSES = ['Planned', 'Active', 'On hold', 'Completed', 'Cancelled'];
export const OV = {
  reportDate: 'B3',
  windowDays: 'B4',
  taskStatusRow: 8, // A8:A11 statuses, B count, C share
  taskPriorityRow: 15, // A15:A18, B all, C open
  projStatusRow: 8, // E8:E12, F count
  projPriorityRow: 15, // E15:E18, F all, G open
  metricsRow: 22, // A22.. metrics, value in B
};
export const METRICS = [
  'totalTasks',
  'openTasks',
  'overdueTasks',
  'tasksDueSoon',
  'mostOverdueDays',
  'tasksDoneRecently',
  'openProjects',
  'overdueProjects',
  'projectDeadlinesSoon',
  'openBudget',
  'avgOpenCompletion',
];

function buildFreelance() {
  const s = FREELANCE_SAMPLE;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CODEVANTASOLUTIONSLTD';
  wb.title = 'Freelance Project Tracker';
  wb.created = new Date(Date.UTC(2026, 0, 1));
  wb.modified = wb.created;

  const RD = `Overview!$B$3`;
  const WIN = `Overview!$B$4`;
  const statusList = `"${TASK_STATUSES.join(',')}"`;
  const prioList = `"${PRIORITIES.join(',')}"`;
  const projStatusList = `"${PROJECT_STATUSES.join(',')}"`;

  // ---------------------------------------------------------- Start Here
  const start = wb.addWorksheet('Start Here', { properties: { tabColor: { argb: COLORS.brand } } });
  writeStartHere(start, 'Freelance Project Tracker', [
    { text: 'Track clients, projects and tasks in one place, with an automatic overview of what is overdue and what is due next.', muted: true },
    '',
    { text: 'Quick start', h: true },
    '1. Delete the SAMPLE rows on Clients, Projects and Tasks (see below).',
    '2. Add your clients on "Clients" - give each a unique Client ID (e.g. C-001).',
    '3. Add projects on "Projects" - give each a unique Project ID (e.g. P-001) and pick the Client ID from the drop-down. The client name fills in automatically.',
    '4. Add tasks on "Tasks" - pick the Project ID, status and priority from the drop-downs, and enter a due date. When a task is finished set its status to Done and enter the done date.',
    '5. Check "Overview" for counts, overdue work and upcoming deadlines.',
    '',
    { text: 'IMPORTANT - sample data', h: true },
    { text: `The ${s.clients.length} clients, ${s.projects.length} projects and ${s.tasks.length} tasks supplied are fictional SAMPLE data (names end in "(sample)" or notes say SAMPLE). Delete them before use.`, warn: true },
    'How to delete: select the sample rows inside each table, right-click and choose Delete > Table Rows. Do this on Tasks first, then Projects, then Clients.',
    '',
    { text: 'Sheet guide', h: true },
    'Clients - client ID, name, contact person, email and notes.',
    'Projects - project ID and name, client ID (drop-down), client name (looked up automatically), start date, deadline, budget, status, priority, % complete (calculated from tasks marked Done) and days to deadline.',
    'Tasks - task, project ID (drop-down), owner, status (Not started / In progress / Blocked / Done), priority (Low / Medium / High / Urgent), due date, done date and days overdue (calculated).',
    'Overview - counts by status and priority, overdue tasks and projects, and deadlines inside the "upcoming window".',
    '',
    { text: 'Report date and upcoming window', h: true },
    'Overview cell B3 holds the report date. It is =TODAY() so the workbook always reports "as of today". To see the position on another date, type a date into B3; to go back, enter =TODAY() again.',
    'Overview cell B4 sets the upcoming window in days (default 14). "Due soon" counts include items due from the report date up to report date + window.',
    '',
    { text: 'Rules used by the calculations', h: true },
    '- A task is overdue when its status is not Done and its due date is before the report date. Days overdue = report date minus due date.',
    '- A project counts as open unless its status is Completed or Cancelled. Open projects past their deadline are flagged red; deadlines inside the window are amber.',
    '- % complete = tasks marked Done / all tasks for that project (0% when a project has no tasks yet).',
    '',
    { text: 'Tips', h: true },
    '- To add a row, type in the first empty row directly under a table - the table grows automatically and the calculated columns are already filled in. Calculations read rows 5 to 1000.',
    '- Keep IDs unique and type them exactly the same way on every sheet (the drop-downs help).',
    '- Shaded cells contain formulas - do not type over them.',
    '',
    { text: 'Compatibility', h: true },
    COMPAT,
    'The workbook uses only standard functions (COUNTIFS, SUMIFS, INDEX, MATCH, IFERROR, TODAY and similar) - no macros, no external links, no dynamic-array functions.',
  ]);

  // ------------------------------------------------------------- Overview
  // (created early so it sits second in the tab order)
  const ov = wb.addWorksheet('Overview', { properties: { tabColor: { argb: 'FF16A34A' } } });

  // -------------------------------------------------------------- Clients
  const cl = wb.addWorksheet('Clients');
  title(cl, 'Clients');
  sampleBanner(cl, `SAMPLE DATA: rows 5-${4 + s.clients.length} are fictional. Delete them (select rows > right-click > Delete > Table Rows) before use.`);
  widths(cl, [12, 34, 22, 32, 40]);
  cl.addTable({
    name: 'ClientsTable',
    ref: 'A4',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Client ID', 'Client name', 'Contact person', 'Email', 'Notes'].map((name) => ({ name, filterButton: true })),
    rows: s.clients.map(([id, name, contact, email, notes]) => [id, `${name} (sample)`, contact, email, `SAMPLE - ${notes}`]),
  });
  freezeHeader(cl);

  // ------------------------------------------------------------- Projects
  const pr = wb.addWorksheet('Projects');
  title(pr, 'Projects');
  sampleBanner(pr, `SAMPLE DATA: rows 5-${4 + s.projects.length} are fictional. Delete them before use. Shaded columns are calculated.`);
  widths(pr, [11, 28, 11, 34, 14, 14, 13, 13, 11, 12, 12]);
  pr.addTable({
    name: 'ProjectsTable',
    ref: 'A4',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Project ID', 'Project name', 'Client ID', 'Client name', 'Start date', 'Deadline', 'Budget', 'Status', 'Priority', '% complete', 'Days to deadline'].map(
      (name) => ({ name, filterButton: true }),
    ),
    rows: s.projects.map(([id, name, cid, startD, deadline, budget, status, prio]) => [
      id,
      `${name} (sample)`,
      cid,
      null,
      d(startD),
      d(deadline),
      budget,
      status,
      prio,
      null,
      null,
    ]),
  });
  for (let r = FIRST; r <= LAST; r += 1) {
    formula(pr, `D${r}`, `IF($C${r}="","",IFERROR(INDEX(${rng('Clients', 'B')},MATCH($C${r},${rng('Clients', 'A')},0)),"Unknown client ID"))`);
    const tasksFor = `${rng('Tasks', 'B')},$A${r},${rng('Tasks', 'A')},"<>"`;
    formula(
      pr,
      `J${r}`,
      `IF($A${r}="","",IF(COUNTIFS(${tasksFor})=0,0,COUNTIFS(${tasksFor},${rng('Tasks', 'D')},"Done")/COUNTIFS(${tasksFor})))`,
      FMT.pct,
    );
    formula(pr, `K${r}`, `IF(OR($A${r}="",$F${r}=""),"",$F${r}-${RD})`, FMT.int);
  }
  pr.getColumn('E').numFmt = FMT.date;
  pr.getColumn('F').numFmt = FMT.date;
  pr.getColumn('G').numFmt = FMT.money;
  pr.dataValidations.add(`C${FIRST}:C${LAST}`, listValidation(rng('Clients', 'A'), 'Client ID', 'Pick a Client ID from the Clients sheet.'));
  pr.dataValidations.add(`H${FIRST}:H${LAST}`, listValidation(projStatusList, 'Status', 'Completed and Cancelled projects are treated as closed.'));
  pr.dataValidations.add(`I${FIRST}:I${LAST}`, listValidation(prioList, 'Priority'));
  const open = (r) => `$H${r}<>"Completed",$H${r}<>"Cancelled"`;
  pr.addConditionalFormatting({
    ref: `F${FIRST}:F${LAST} K${FIRST}:K${LAST}`,
    rules: [
      { type: 'expression', priority: 1, formulae: [`AND(ISNUMBER($K${FIRST}),$K${FIRST}<0,${open(FIRST)})`], style: { font: { bold: true, color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } },
      { type: 'expression', priority: 2, formulae: [`AND(ISNUMBER($K${FIRST}),$K${FIRST}>=0,$K${FIRST}<=${WIN},${open(FIRST)})`], style: { font: { color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } },
    ],
  });
  pr.addConditionalFormatting({
    ref: `H${FIRST}:H${LAST}`,
    rules: [
      { type: 'cellIs', operator: 'equal', priority: 3, formulae: ['"Completed"'], style: { font: { color: { argb: COLORS.goodFont } }, fill: fill(COLORS.goodFill) } },
      { type: 'cellIs', operator: 'equal', priority: 4, formulae: ['"Active"'], style: { font: { color: { argb: COLORS.infoFont } }, fill: fill(COLORS.infoFill) } },
      { type: 'cellIs', operator: 'equal', priority: 5, formulae: ['"On hold"'], style: { font: { color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } },
      { type: 'cellIs', operator: 'equal', priority: 6, formulae: ['"Cancelled"'], style: { font: { color: { argb: COLORS.muted }, strike: true } } },
    ],
  });
  pr.addConditionalFormatting({
    ref: `J${FIRST}:J${LAST}`,
    rules: [{ type: 'dataBar', priority: 7, cfvo: [{ type: 'num', value: 0 }, { type: 'num', value: 1 }], color: { argb: 'FF63BE7B' }, gradient: false }],
  });
  freezeHeader(pr);
  landscape(pr);

  // ---------------------------------------------------------------- Tasks
  const tk = wb.addWorksheet('Tasks');
  title(tk, 'Tasks');
  sampleBanner(tk, `SAMPLE DATA: rows 5-${4 + s.tasks.length} are fictional. Delete them before use. "Days overdue" is calculated against the report date on Overview.`);
  widths(tk, [32, 11, 20, 14, 11, 14, 14, 13]);
  tk.addTable({
    name: 'TasksTable',
    ref: 'A4',
    headerRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: ['Task', 'Project ID', 'Owner', 'Status', 'Priority', 'Due date', 'Done date', 'Days overdue'].map((name) => ({ name, filterButton: true })),
    rows: s.tasks.map(([task, pid, owner, status, prio, due, done]) => [`${task} (sample)`, pid, owner, status, prio, d(due), done ? d(done) : null, null]),
  });
  for (let r = FIRST; r <= LAST; r += 1) {
    formula(tk, `H${r}`, `IF(OR($A${r}="",$F${r}=""),"",IF($D${r}="Done",0,MAX(0,${RD}-$F${r})))`, FMT.int);
  }
  tk.getColumn('F').numFmt = FMT.date;
  tk.getColumn('G').numFmt = FMT.date;
  tk.dataValidations.add(`B${FIRST}:B${LAST}`, listValidation(rng('Projects', 'A'), 'Project ID', 'Pick a Project ID from the Projects sheet.'));
  tk.dataValidations.add(`D${FIRST}:D${LAST}`, listValidation(statusList, 'Status', 'Set to Done when finished and add the done date.'));
  tk.dataValidations.add(`E${FIRST}:E${LAST}`, listValidation(prioList, 'Priority'));
  tk.addConditionalFormatting({
    ref: `A${FIRST}:H${LAST}`,
    rules: [
      { type: 'expression', priority: 1, formulae: [`AND(ISNUMBER($H${FIRST}),$H${FIRST}>0)`], style: { font: { color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } },
    ],
  });
  tk.addConditionalFormatting({
    ref: `D${FIRST}:D${LAST}`,
    rules: [
      { type: 'cellIs', operator: 'equal', priority: 2, formulae: ['"Done"'], style: { font: { color: { argb: COLORS.goodFont } }, fill: fill(COLORS.goodFill) } },
      { type: 'cellIs', operator: 'equal', priority: 3, formulae: ['"Blocked"'], style: { font: { bold: true, color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } },
      { type: 'cellIs', operator: 'equal', priority: 4, formulae: ['"In progress"'], style: { font: { color: { argb: COLORS.infoFont } }, fill: fill(COLORS.infoFill) } },
    ],
  });
  tk.addConditionalFormatting({
    ref: `E${FIRST}:E${LAST}`,
    rules: [{ type: 'cellIs', operator: 'equal', priority: 5, formulae: ['"Urgent"'], style: { font: { bold: true, color: { argb: COLORS.badFont } } } }],
  });
  freezeHeader(tk);
  landscape(tk);

  // ------------------------------------------------------- Overview body
  ov.views = [{ showGridLines: false }];
  widths(ov, [40, 14, 14, 4, 22, 12, 12]);
  ov.getCell('A1').value = 'Overview';
  ov.getCell('A1').font = { size: 18, bold: true, color: { argb: COLORS.brand } };
  label(ov, 'A3', 'Report date (=TODAY() by default; type a date to override)', { bold: true });
  ov.getCell('B3').value = { formula: 'TODAY()' };
  ov.getCell('B3').numFmt = FMT.date;
  ov.getCell('B3').border = { bottom: { style: 'thin' } };
  label(ov, 'A4', 'Upcoming window (days)', { bold: true });
  ov.getCell('B4').value = 14;
  ov.getCell('B4').dataValidation = {
    type: 'whole',
    operator: 'between',
    allowBlank: false,
    formulae: [1, 365],
    showErrorMessage: true,
    errorTitle: 'Window',
    error: 'Enter a whole number of days from 1 to 365.',
  };
  ov.getCell('B4').border = { bottom: { style: 'thin' } };

  const T = {
    task: rng('Tasks', 'A'),
    pid: rng('Tasks', 'B'),
    status: rng('Tasks', 'D'),
    prio: rng('Tasks', 'E'),
    due: rng('Tasks', 'F'),
    done: rng('Tasks', 'G'),
    over: rng('Tasks', 'H'),
  };
  const P = { id: rng('Projects', 'A'), deadline: rng('Projects', 'F'), budget: rng('Projects', 'G'), status: rng('Projects', 'H'), prio: rng('Projects', 'I'), pct: rng('Projects', 'J') };
  const hasTask = `${T.task},"<>"`;
  const openTask = `${hasTask},${T.status},"<>Done"`;
  const hasProj = `${P.id},"<>"`;
  const openProj = `${hasProj},${P.status},"<>Completed",${P.status},"<>Cancelled"`;

  // Tasks by status
  label(ov, `A${OV.taskStatusRow - 2}`, 'Tasks by status', { section: true });
  headerRow(ov, OV.taskStatusRow - 1, ['Status', 'Tasks', 'Share'], 1);
  TASK_STATUSES.forEach((st, i) => {
    const r = OV.taskStatusRow + i;
    label(ov, `A${r}`, st);
    formula(ov, `B${r}`, `COUNTIFS(${hasTask},${T.status},$A${r})`, FMT.int);
    formula(ov, `C${r}`, `IF($B$${OV.metricsRow}=0,0,B${r}/$B$${OV.metricsRow})`, FMT.pct);
  });
  // Tasks by priority
  label(ov, `A${OV.taskPriorityRow - 2}`, 'Tasks by priority', { section: true });
  headerRow(ov, OV.taskPriorityRow - 1, ['Priority', 'All tasks', 'Open tasks'], 1);
  PRIORITIES.forEach((p, i) => {
    const r = OV.taskPriorityRow + i;
    label(ov, `A${r}`, p);
    formula(ov, `B${r}`, `COUNTIFS(${hasTask},${T.prio},$A${r})`, FMT.int);
    formula(ov, `C${r}`, `COUNTIFS(${openTask},${T.prio},$A${r})`, FMT.int);
  });
  // Projects by status
  label(ov, `E${OV.projStatusRow - 2}`, 'Projects by status', { section: true });
  headerRow(ov, OV.projStatusRow - 1, ['Status', 'Projects'], 5);
  PROJECT_STATUSES.forEach((st, i) => {
    const r = OV.projStatusRow + i;
    label(ov, `E${r}`, st);
    formula(ov, `F${r}`, `COUNTIFS(${hasProj},${P.status},$E${r})`, FMT.int);
  });
  // Projects by priority
  label(ov, `E${OV.projPriorityRow - 2}`, 'Projects by priority', { section: true });
  headerRow(ov, OV.projPriorityRow - 1, ['Priority', 'All', 'Open'], 5);
  PRIORITIES.forEach((p, i) => {
    const r = OV.projPriorityRow + i;
    label(ov, `E${r}`, p);
    formula(ov, `F${r}`, `COUNTIFS(${hasProj},${P.prio},$E${r})`, FMT.int);
    formula(ov, `G${r}`, `COUNTIFS(${openProj},${P.prio},$E${r})`, FMT.int);
  });

  // Key metrics
  const m = OV.metricsRow;
  label(ov, `A${m - 2}`, 'Key metrics', { section: true });
  headerRow(ov, m - 1, ['Metric', 'Value'], 1);
  const metricDefs = {
    totalTasks: ['Total tasks', `COUNTIFS(${hasTask})`, FMT.int],
    openTasks: ['Open tasks (not Done)', `COUNTIFS(${openTask})`, FMT.int],
    overdueTasks: ['Overdue tasks', `COUNTIFS(${openTask},${T.due},"<"&$B$3)`, FMT.int],
    tasksDueSoon: [`="Open tasks due in the next "&$B$4&" days"`, `COUNTIFS(${openTask},${T.due},">="&$B$3,${T.due},"<="&($B$3+$B$4))`, FMT.int],
    mostOverdueDays: ['Most overdue task (days)', `MAX(0,MAX(${T.over}))`, FMT.int],
    tasksDoneRecently: [`="Tasks completed in the last "&$B$4&" days"`, `COUNTIFS(${hasTask},${T.status},"Done",${T.done},">="&($B$3-$B$4),${T.done},"<="&$B$3)`, FMT.int],
    openProjects: ['Open projects (not Completed / Cancelled)', `COUNTIFS(${openProj})`, FMT.int],
    overdueProjects: ['Open projects past deadline', `COUNTIFS(${openProj},${P.deadline},"<"&$B$3)`, FMT.int],
    projectDeadlinesSoon: [`="Project deadlines in the next "&$B$4&" days"`, `COUNTIFS(${openProj},${P.deadline},">="&$B$3,${P.deadline},"<="&($B$3+$B$4))`, FMT.int],
    openBudget: ['Budget of open projects', `SUMIFS(${P.budget},${openProj})`, FMT.money],
    avgOpenCompletion: ['Average % complete of open projects', `IF(B${m + 6}=0,0,SUMIFS(${P.pct},${openProj})/B${m + 6})`, FMT.pct],
  };
  METRICS.forEach((key, i) => {
    const r = m + i;
    const [text, f, fmt] = metricDefs[key];
    if (text.startsWith('=')) formula(ov, `A${r}`, text.slice(1)).fill = undefined;
    else label(ov, `A${r}`, text);
    ov.getCell(`A${r}`).font = { bold: true };
    formula(ov, `B${r}`, f, fmt);
  });
  if (METRICS[6] !== 'openProjects') throw new Error('metric order changed - update avgOpenCompletion formula');
  const metricRow = (key) => m + METRICS.indexOf(key);
  ov.addConditionalFormatting({
    ref: `B${metricRow('overdueTasks')} B${metricRow('overdueProjects')}`,
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 1, style: { font: { bold: true, color: { argb: COLORS.badFont } }, fill: fill(COLORS.badFill) } }],
  });
  ov.addConditionalFormatting({
    ref: `B${metricRow('tasksDueSoon')} B${metricRow('projectDeadlinesSoon')}`,
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 2, style: { font: { bold: true, color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } }],
  });
  ov.addConditionalFormatting({
    ref: `B${OV.taskStatusRow + 2}`,
    rules: [{ type: 'cellIs', operator: 'greaterThan', formulae: [0], priority: 3, style: { font: { bold: true, color: { argb: COLORS.warnFont } }, fill: fill(COLORS.warnFill) } }],
  });
  landscape(ov);
  return wb;
}

// ============================================================== pipeline ==

/** Recalculate a workbook with HyperFormula and store results as cached values. */
async function cacheResults(wb, name) {
  const buffer = await wb.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer);
  const { hf, formulaCells } = workbookToHyperFormula(reloaded);
  const errors = findErrors(hf, formulaCells);
  if (errors.length) {
    throw new Error(`${name}: ${errors.length} formula error(s):\n${errors.slice(0, 20).join('\n')}`);
  }
  for (const fc of formulaCells) {
    const sheet = hf.getSheetId(fc.sheet);
    const value = hf.getCellValue({ sheet, row: fc.row, col: fc.col });
    if (value instanceof DetailedCellError) throw new Error('unreachable');
    const cell = wb.getWorksheet(fc.sheet).getCell(fc.address);
    const f = cell.formula;
    if (!f) throw new Error(`${name}: lost formula at ${fc.sheet}!${fc.address}`);
    cell.value = { formula: f, result: value === null ? '' : value };
  }
  hf.destroy();
  wb.calcProperties.fullCalcOnLoad = true;
  return formulaCells.length;
}

async function main() {
  const jobs = [
    ['Small-Business-Finance-Tracker.xlsx', buildFinance, FINANCE_PATH],
    ['Freelance-Project-Tracker.xlsx', buildFreelance, FREELANCE_PATH],
  ];
  for (const [name, build, out] of jobs) {
    const wb = build();
    const count = await cacheResults(wb, name);
    mkdirSync(path.dirname(out), { recursive: true });
    await wb.xlsx.writeFile(out);
    console.log(`built ${path.relative(ROOT, out)} - ${wb.worksheets.length} sheets, ${count} formulas recalculated without errors, cached results stored`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

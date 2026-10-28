// Dev-time helper: load an exceljs workbook into HyperFormula so every formula
// can be recalculated and checked in Node. HyperFormula (GPL-v3 licence key) is
// used ONLY by the build/verification scripts; it is never shipped to buyers.

import { HyperFormula, DetailedCellError } from 'hyperformula';

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;

/** Convert a JS Date (as written/read by exceljs, i.e. UTC midnight) to an Excel serial number. */
export function dateToSerial(date) {
  return Math.round((date.getTime() - EXCEL_EPOCH_MS) / DAY_MS);
}

/** Convert an Excel serial number to a UTC Date. */
export function serialToDate(serial) {
  return new Date(EXCEL_EPOCH_MS + serial * DAY_MS);
}

/** Excel-style A1 address for zero-based row/col. */
export function a1(row0, col0) {
  let n = col0 + 1;
  let letters = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    letters = String.fromCharCode(65 + r) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row0 + 1}`;
}

/** Translate an exceljs cell value into HyperFormula raw input. */
function toRawContent(cell) {
  const v = cell.value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && !(v instanceof Date)) {
    if (v.formula !== undefined || v.sharedFormula !== undefined) {
      const f = cell.formula;
      if (!f) throw new Error(`Cell ${cell.worksheet.name}!${cell.address} has a formula exceljs could not resolve`);
      return `=${f}`;
    }
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if (v.text !== undefined) return String(v.text);
    if (v.error !== undefined) return v.error;
    throw new Error(`Unsupported cell value at ${cell.worksheet.name}!${cell.address}`);
  }
  if (v instanceof Date) return dateToSerial(v);
  if (typeof v === 'string') return v === '' ? null : v;
  return v; // number | boolean
}

/**
 * Build a HyperFormula instance from every worksheet of an exceljs workbook.
 * Returns { hf, formulaCells } where formulaCells lists { sheet, row, col, address, cell }.
 */
export function workbookToHyperFormula(workbook) {
  const sheets = {};
  const formulaCells = [];
  workbook.eachSheet((ws) => {
    const data = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const raw = toRawContent(cell);
        if (raw === null) return;
        const r = rowNumber - 1;
        const c = colNumber - 1;
        while (data.length <= r) data.push([]);
        const line = data[r];
        while (line.length <= c) line.push(null);
        line[c] = raw;
        if (typeof raw === 'string' && raw.startsWith('=')) {
          formulaCells.push({ sheet: ws.name, row: r, col: c, address: a1(r, c), cell });
        }
      });
    });
    sheets[ws.name] = data.length ? data : [[]];
  });
  const hf = HyperFormula.buildFromSheets(sheets, { licenseKey: 'gpl-v3' });
  return { hf, formulaCells };
}

/** Read a calculated value by sheet name + A1 address. */
export function valueAt(hf, sheetName, address) {
  const sheet = hf.getSheetId(sheetName);
  if (sheet === undefined) throw new Error(`No sheet named ${sheetName}`);
  const addr = hf.simpleCellAddressFromString(address, sheet);
  return hf.getCellValue(addr);
}

/** Set raw content (number/string/formula) by sheet name + A1 address. */
export function setAt(hf, sheetName, address, content) {
  const sheet = hf.getSheetId(sheetName);
  const addr = hf.simpleCellAddressFromString(address, sheet);
  hf.setCellContents(addr, [[content]]);
}

/** Return every formula cell whose calculated value is an error. */
export function findErrors(hf, formulaCells) {
  const errors = [];
  for (const fc of formulaCells) {
    const sheet = hf.getSheetId(fc.sheet);
    const value = hf.getCellValue({ sheet, row: fc.row, col: fc.col });
    if (value instanceof DetailedCellError) {
      errors.push(`${fc.sheet}!${fc.address}: ${value.value} (${value.message}) in ${hf.getCellFormula({ sheet, row: fc.row, col: fc.col })}`);
    }
  }
  return errors;
}

export { DetailedCellError };

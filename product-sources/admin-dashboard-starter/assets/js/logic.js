/*
 * logic.js — pure data helpers (no DOM). Exposed as window.DashLogic in the
 * browser and via module.exports in Node, so they can be unit-tested.
 */
(function (root) {
  "use strict";

  /* ---------- Table helpers ---------- */

  /**
   * Filter rows by a free-text query (matched against the given keys,
   * case-insensitive) and an exact status value ("" or "all" = any).
   */
  function filterRows(rows, options) {
    var opts = options || {};
    var query = String(opts.query || "").trim().toLowerCase();
    var status = opts.status && opts.status !== "all" ? opts.status : "";
    var keys = opts.keys || ["id", "customer", "email"];
    return rows.filter(function (row) {
      if (status && row.status !== status) return false;
      if (!query) return true;
      return keys.some(function (key) {
        return String(row[key] == null ? "" : row[key]).toLowerCase().indexOf(query) !== -1;
      });
    });
  }

  /** Return a new array sorted by key. Numbers sort numerically, everything else as text. Stable. */
  function sortRows(rows, key, direction) {
    var dir = direction === "descending" ? -1 : 1;
    return rows
      .map(function (row, index) { return { row: row, index: index }; })
      .sort(function (a, b) {
        var x = a.row[key];
        var y = b.row[key];
        var cmp;
        if (typeof x === "number" && typeof y === "number") cmp = x - y;
        else cmp = String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
        return cmp !== 0 ? cmp * dir : a.index - b.index;
      })
      .map(function (entry) { return entry.row; });
  }

  /**
   * Slice rows into a page. Page numbers are 1-based and clamped to the valid range.
   * Returns { items, page, pageSize, totalPages, total, start, end } where start/end
   * are 1-based row numbers for "Showing start–end of total" (0 when empty).
   */
  function paginate(rows, page, pageSize) {
    var size = Math.max(1, Math.floor(Number(pageSize) || 10));
    var total = rows.length;
    var totalPages = Math.max(1, Math.ceil(total / size));
    var current = Math.min(Math.max(1, Math.floor(Number(page) || 1)), totalPages);
    var startIndex = (current - 1) * size;
    var items = rows.slice(startIndex, startIndex + size);
    return {
      items: items,
      page: current,
      pageSize: size,
      totalPages: totalPages,
      total: total,
      start: total === 0 ? 0 : startIndex + 1,
      end: startIndex + items.length
    };
  }

  /** Count rows per status value, e.g. { Paid: 27, Pending: 8 }. */
  function countBy(rows, key) {
    return rows.reduce(function (acc, row) {
      acc[row[key]] = (acc[row[key]] || 0) + 1;
      return acc;
    }, {});
  }

  /* ---------- Chart helpers ---------- */

  /** Round a maximum up to a "nice" axis limit (1, 2, 2.5, 5 or 10 × 10^n). */
  function niceMax(value) {
    var v = Number(value);
    if (!isFinite(v) || v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * exp >= v) return steps[i] * exp;
    }
    return 10 * exp;
  }

  /** Evenly spaced tick values from 0 to max inclusive. */
  function ticks(max, count) {
    var n = Math.max(1, count || 4);
    var out = [];
    for (var i = 0; i <= n; i++) out.push(Math.round((max / n) * i * 1e6) / 1e6);
    return out;
  }

  /**
   * Map data values to SVG coordinates inside a plot box.
   * box = { x, y, width, height }; returns [{ x, y, value, label }].
   */
  function linePoints(data, box, max) {
    var n = data.length;
    return data.map(function (d, i) {
      var x = n === 1 ? box.x + box.width / 2 : box.x + (box.width * i) / (n - 1);
      var y = box.y + box.height - (d.value / max) * box.height;
      return { x: round(x), y: round(y), value: d.value, label: d.label };
    });
  }

  /** Bar geometry for a vertical bar chart. gapRatio = share of each band left empty. */
  function barRects(data, box, max, gapRatio) {
    var band = box.width / data.length;
    var gap = band * (gapRatio == null ? 0.4 : gapRatio);
    return data.map(function (d, i) {
      var h = (d.value / max) * box.height;
      return {
        x: round(box.x + band * i + gap / 2),
        y: round(box.y + box.height - h),
        width: round(band - gap),
        height: round(h),
        cx: round(box.x + band * i + band / 2),
        value: d.value,
        label: d.label
      };
    });
  }

  /** Percentage change from a to b, one decimal place. */
  function percentChange(a, b) {
    if (!a) return 0;
    return Math.round(((b - a) / a) * 1000) / 10;
  }

  function round(n) { return Math.round(n * 100) / 100; }

  var api = {
    filterRows: filterRows,
    sortRows: sortRows,
    paginate: paginate,
    countBy: countBy,
    niceMax: niceMax,
    ticks: ticks,
    linePoints: linePoints,
    barRects: barRects,
    percentChange: percentChange
  };

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.DashLogic = api;
})(typeof self !== "undefined" ? self : this);

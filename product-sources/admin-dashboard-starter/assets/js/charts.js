/*
 * charts.js — overview page: metric cards plus a line chart and a bar chart
 * drawn as inline SVG from window.DashboardData. Each chart also gets a text
 * summary and a data table so the information never depends on the graphic.
 * Requires data.js and logic.js.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var W = 640;
  var H = 280;
  var PAD = { top: 20, right: 24, bottom: 36, left: 64 };

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function money(value, currency, compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: currency || "USD",
      notation: compact ? "compact" : "standard", maximumFractionDigits: compact ? 1 : 0
    }).format(value);
  }
  function count(value) { return new Intl.NumberFormat("en-US").format(value); }

  function plotBox() {
    return { x: PAD.left, y: PAD.top, width: W - PAD.left - PAD.right, height: H - PAD.top - PAD.bottom };
  }

  function baseSvg(container) {
    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-labelledby": container.getAttribute("data-title-id"),
      "aria-describedby": container.getAttribute("data-summary-id")
    });
    container.appendChild(svg);
    return svg;
  }

  function drawGrid(svg, box, max, format) {
    var logic = window.DashLogic;
    logic.ticks(max, 4).forEach(function (t) {
      var y = box.y + box.height - (t / max) * box.height;
      el("line", { x1: box.x, x2: box.x + box.width, y1: y, y2: y, "class": t === 0 ? "axis-line" : "grid-line" }, svg);
      var label = el("text", { x: box.x - 10, y: y + 4, "text-anchor": "end" }, svg);
      label.textContent = format(t);
    });
  }

  /* Shared tooltip that follows hovered marks. */
  function tooltipFor(container) {
    var tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.hidden = true;
    tip.setAttribute("aria-hidden", "true");
    container.appendChild(tip);
    return {
      show: function (svg, x, y, text) {
        var rect = svg.getBoundingClientRect();
        var scale = rect.width / W;
        tip.style.left = x * scale + "px";
        tip.style.top = y * scale + "px";
        tip.textContent = text;
        tip.hidden = false;
      },
      hide: function () { tip.hidden = true; }
    };
  }

  function dataTable(container, caption, headers, rows) {
    var details = document.createElement("details");
    details.className = "data-table";
    var summary = document.createElement("summary");
    summary.textContent = "Show data table";
    details.appendChild(summary);
    var wrap = document.createElement("div");
    wrap.className = "table-wrap";
    var table = document.createElement("table");
    var cap = document.createElement("caption");
    cap.textContent = caption;
    table.appendChild(cap);
    var thead = table.createTHead().insertRow();
    headers.forEach(function (h, i) {
      var th = document.createElement("th");
      th.scope = "col";
      th.textContent = h;
      if (i > 0) th.className = "num";
      thead.appendChild(th);
    });
    var tbody = table.createTBody();
    rows.forEach(function (r) {
      var tr = tbody.insertRow();
      r.forEach(function (cell, i) {
        var c = document.createElement(i === 0 ? "th" : "td");
        if (i === 0) c.scope = "row"; else c.className = "num";
        c.textContent = cell;
        tr.appendChild(c);
      });
    });
    wrap.appendChild(table);
    details.appendChild(wrap);
    container.appendChild(details);
  }

  /* ---------- Line chart: revenue by month ---------- */
  function renderLineChart(container, data, currency) {
    var logic = window.DashLogic;
    var box = plotBox();
    var max = logic.niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var svg = baseSvg(container);
    var tip = tooltipFor(container);
    drawGrid(svg, box, max, function (v) { return money(v, currency, true); });

    var pts = logic.linePoints(data, box, max);
    var linePath = pts.map(function (p, i) { return (i ? "L" : "M") + p.x + " " + p.y; }).join(" ");
    var baseY = box.y + box.height;
    el("path", { d: linePath + " L" + pts[pts.length - 1].x + " " + baseY + " L" + pts[0].x + " " + baseY + " Z", "class": "area" }, svg);
    el("path", { d: linePath, "class": "line" }, svg);

    pts.forEach(function (p, i) {
      var label = el("text", { x: p.x, y: H - 12, "text-anchor": "middle" }, svg);
      label.textContent = p.label;
      var hit = el("circle", { cx: p.x, cy: p.y, r: 16, "class": "hit" }, svg);
      el("circle", { cx: p.x, cy: p.y, r: 4, "class": "dot" }, svg);
      var text = p.label + ": " + money(p.value, currency);
      hit.addEventListener("mouseenter", function () { tip.show(svg, p.x, p.y, text); });
      hit.addEventListener("mouseleave", tip.hide);
      if (i === pts.length - 1) {
        var direct = el("text", { x: p.x, y: p.y - 12, "text-anchor": "end", "class": "value-label" }, svg);
        direct.textContent = money(p.value, currency, true);
      }
    });
    svg.addEventListener("mouseleave", tip.hide);

    var values = data.map(function (d) { return d.value; });
    var hi = data[values.indexOf(Math.max.apply(null, values))];
    var lo = data[values.indexOf(Math.min.apply(null, values))];
    var first = data[0];
    var last = data[data.length - 1];
    var change = logic.percentChange(first.value, last.value);
    var summary = document.getElementById(container.getAttribute("data-summary-id"));
    if (summary) {
      summary.textContent = "Revenue went from " + money(first.value, currency) + " in " + first.label +
        " to " + money(last.value, currency) + " in " + last.label + " (" + (change >= 0 ? "+" : "") + change +
        "%). Highest month: " + hi.label + " (" + money(hi.value, currency) + "). Lowest month: " +
        lo.label + " (" + money(lo.value, currency) + ").";
    }
    dataTable(container.parentNode, "Monthly revenue", ["Month", "Revenue"], data.map(function (d) {
      return [d.label, money(d.value, currency)];
    }));
  }

  /* ---------- Bar chart: orders by channel ---------- */
  function renderBarChart(container, data) {
    var logic = window.DashLogic;
    var box = plotBox();
    var max = logic.niceMax(Math.max.apply(null, data.map(function (d) { return d.value; })));
    var svg = baseSvg(container);
    var tip = tooltipFor(container);
    drawGrid(svg, box, max, count);

    var total = data.reduce(function (s, d) { return s + d.value; }, 0);
    logic.barRects(data, box, max, 0.45).forEach(function (b) {
      var g = el("g", { "class": "bar-group" }, svg);
      // Rounded top (4px) anchored to a square baseline.
      var r = Math.min(4, b.width / 2, b.height);
      var d = "M" + b.x + " " + (b.y + b.height) + " V" + (b.y + r) +
        " Q" + b.x + " " + b.y + " " + (b.x + r) + " " + b.y +
        " H" + (b.x + b.width - r) + " Q" + (b.x + b.width) + " " + b.y + " " + (b.x + b.width) + " " + (b.y + r) +
        " V" + (b.y + b.height) + " Z";
      el("path", { d: d, "class": "bar" }, g);
      var hit = el("rect", { x: b.x - 6, y: box.y, width: b.width + 12, height: box.height, "class": "hit" }, g);
      var value = el("text", { x: b.cx, y: b.y - 8, "text-anchor": "middle", "class": "value-label" }, g);
      value.textContent = count(b.value);
      var label = el("text", { x: b.cx, y: H - 12, "text-anchor": "middle" }, g);
      label.textContent = b.label;
      var share = Math.round((b.value / total) * 1000) / 10;
      hit.addEventListener("mouseenter", function () { tip.show(svg, b.cx, b.y, b.label + ": " + count(b.value) + " orders (" + share + "%)"); });
      hit.addEventListener("mouseleave", tip.hide);
    });

    var top = data.slice().sort(function (a, b) { return b.value - a.value; })[0];
    var summary = document.getElementById(container.getAttribute("data-summary-id"));
    if (summary) {
      summary.textContent = count(total) + " orders across " + data.length + " channels. " + top.label +
        " is the largest channel with " + count(top.value) + " orders (" + Math.round((top.value / total) * 100) + "% of total).";
    }
    dataTable(container.parentNode, "Orders by channel", ["Channel", "Orders", "Share"], data.map(function (d) {
      return [d.label, count(d.value), (Math.round((d.value / total) * 1000) / 10) + "%"];
    }));
  }

  /* ---------- Metric cards ---------- */
  function renderMetrics(list, metrics) {
    list.innerHTML = "";
    metrics.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "card";
      var label = document.createElement("p");
      label.className = "metric-label";
      label.textContent = m.label;
      var value = document.createElement("p");
      value.className = "metric-value";
      value.textContent = m.value;
      var change = document.createElement("span");
      change.className = "metric-change " + (m.trend === "down" ? "is-down" : "is-up");
      change.textContent = (m.trend === "down" ? "↓ " : "↑ ") + m.change;
      var sr = document.createElement("span");
      sr.className = "visually-hidden";
      sr.textContent = " compared with the previous period";
      change.appendChild(sr);
      li.appendChild(label);
      li.appendChild(value);
      li.appendChild(change);
      list.appendChild(li);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var data = window.DashboardData;
    if (!data || !window.DashLogic) return;
    var metrics = document.querySelector("[data-metrics]");
    if (metrics) renderMetrics(metrics, data.metrics);
    var line = document.querySelector("[data-chart='revenue']");
    if (line) renderLineChart(line, data.revenueByMonth, data.currency);
    var bar = document.querySelector("[data-chart='channels']");
    if (bar) renderBarChart(bar, data.ordersByChannel);
  });
})();

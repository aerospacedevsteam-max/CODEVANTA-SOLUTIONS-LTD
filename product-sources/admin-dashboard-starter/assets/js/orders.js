/*
 * orders.js — client-side search, status filter, sortable columns and
 * pagination for the orders table. Requires data.js and logic.js.
 * For large datasets move filtering/sorting/paging to your API and keep
 * only the rendering part of this file.
 */
(function () {
  "use strict";

  var state = { query: "", status: "all", sortKey: "date", sortDir: "descending", page: 1, pageSize: 10 };

  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  var dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  function formatDate(iso) {
    var parts = iso.split("-");
    return dateFmt.format(new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2])));
  }

  function cell(tr, text, className, tag) {
    var c = document.createElement(tag || "td");
    if (className) c.className = className;
    c.textContent = text;
    tr.appendChild(c);
    return c;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var data = window.DashboardData;
    var logic = window.DashLogic;
    var table = document.getElementById("orders-table");
    if (!data || !logic || !table) return;

    var tbody = table.querySelector("tbody");
    var search = document.getElementById("order-search");
    var statusSelect = document.getElementById("status-filter");
    var sizeSelect = document.getElementById("page-size");
    var summary = document.getElementById("table-summary");
    var pager = document.getElementById("pager");
    var empty = document.getElementById("empty-state");
    var topSearch = document.getElementById("global-search");

    // Accept ?q= from the top-bar search on other pages.
    var params = new URLSearchParams(window.location.search);
    if (params.get("q")) {
      state.query = params.get("q");
      search.value = state.query;
      if (topSearch) topSearch.value = state.query;
    }

    function render() {
      var filtered = logic.filterRows(data.orders, { query: state.query, status: state.status });
      var sorted = logic.sortRows(filtered, state.sortKey, state.sortDir);
      var result = logic.paginate(sorted, state.page, state.pageSize);
      state.page = result.page;

      tbody.innerHTML = "";
      result.items.forEach(function (o) {
        var tr = document.createElement("tr");
        var idCell = cell(tr, o.id, "", "th");
        idCell.scope = "row";
        cell(tr, o.customer);
        cell(tr, formatDate(o.date));
        cell(tr, o.channel);
        cell(tr, String(o.items), "num");
        cell(tr, money.format(o.total), "num");
        var statusCell = document.createElement("td");
        var badge = document.createElement("span");
        badge.className = "status status-" + o.status.toLowerCase();
        badge.textContent = o.status;
        statusCell.appendChild(badge);
        tr.appendChild(statusCell);
        tbody.appendChild(tr);
      });

      empty.hidden = result.total !== 0;
      summary.textContent = result.total === 0
        ? "No orders match your filters."
        : "Showing " + result.start + "–" + result.end + " of " + result.total + " orders";

      table.querySelectorAll("th[data-sort-key]").forEach(function (th) {
        if (th.getAttribute("data-sort-key") === state.sortKey) th.setAttribute("aria-sort", state.sortDir);
        else th.removeAttribute("aria-sort");
      });
      renderPager(result);
    }

    function pageButton(label, page, opts) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-secondary";
      b.textContent = label;
      if (opts.ariaLabel) b.setAttribute("aria-label", opts.ariaLabel);
      if (opts.current) b.setAttribute("aria-current", "page");
      b.disabled = !!opts.disabled;
      b.addEventListener("click", function () {
        state.page = page;
        render();
        var target = pager.querySelector("[aria-current='page']");
        if (opts.keepFocus && !b.disabled) b.focus(); else if (target) target.focus();
      });
      li.appendChild(b);
      return li;
    }

    function renderPager(result) {
      pager.innerHTML = "";
      if (result.total === 0) return;
      pager.appendChild(pageButton("Previous", result.page - 1, { disabled: result.page === 1, keepFocus: true, ariaLabel: "Previous page" }));
      for (var p = 1; p <= result.totalPages; p++) {
        pager.appendChild(pageButton(String(p), p, { current: p === result.page, ariaLabel: "Page " + p }));
      }
      pager.appendChild(pageButton("Next", result.page + 1, { disabled: result.page === result.totalPages, keepFocus: true, ariaLabel: "Next page" }));
    }

    var debounce;
    search.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        state.query = search.value;
        state.page = 1;
        render();
      }, 150);
    });
    statusSelect.addEventListener("change", function () {
      state.status = statusSelect.value;
      state.page = 1;
      render();
    });
    sizeSelect.addEventListener("change", function () {
      state.pageSize = Number(sizeSelect.value);
      state.page = 1;
      render();
    });
    table.querySelectorAll("th[data-sort-key] .sort-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.parentNode.getAttribute("data-sort-key");
        if (state.sortKey === key) state.sortDir = state.sortDir === "ascending" ? "descending" : "ascending";
        else { state.sortKey = key; state.sortDir = "ascending"; }
        state.page = 1;
        render();
      });
    });

    // Keep the filter form from reloading the page.
    var form = document.getElementById("orders-filters");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); });

    render();
  });
})();

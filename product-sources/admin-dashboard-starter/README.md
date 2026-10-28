# Admin Dashboard Starter

A three-page admin interface written in plain HTML5, CSS and vanilla JavaScript. It needs no build step, framework, chart library, CDN or web font. The demo product, **Halvane Admin**, and the store whose data it shows, **Brindlewood Supply Co.**, are both fictional. Every name, email address and number in the sample data is invented, and the email addresses use the reserved `example.com` domain.

Open `index.html` in a browser to start.

## What's included

```
admin-dashboard-starter/
├── index.html              Overview: metric cards, revenue line chart, orders-by-channel bar chart
├── orders.html             Orders table: search, status filter, sortable columns, pagination
├── settings.html           Settings: tabs (Profile, Notifications, Security), form layouts, toggle switches
├── assets/
│   ├── css/dashboard.css   All styles; design tokens in a single :root block
│   └── js/
│       ├── data.js         FICTIONAL sample data (window.DashboardData)
│       ├── logic.js        Pure helpers: filter/sort/paginate, chart scales and geometry (window.DashLogic)
│       ├── app.js          Shared shell: collapsible sidebar, tabs, demo form handling
│       ├── charts.js       Builds the metric cards and inline-SVG charts, with text summaries and data tables
│       └── orders.js       Orders table UI
├── README.md
├── CHANGELOG.md
└── LICENSE.txt
```

Scripts used by each page:

| Page | Scripts, in this order |
| --- | --- |
| `index.html` | `data.js`, `logic.js`, `app.js`, `charts.js` |
| `orders.html` | `data.js`, `logic.js`, `app.js`, `orders.js` |
| `settings.html` | `app.js` |

## Customising

**Theme.** Edit the `:root` block at the top of `dashboard.css`. Chart colours come from `--chart-line`, `--chart-area`, `--chart-bar` and `--chart-grid`. Status badge colours come from the `--success`, `--warning`, `--danger` and `--info` token pairs.

**Navigation.** The sidebar markup is repeated on each page, between the `Sidebar (shared)` comments. Add a link to all three pages and put `aria-current="page"` on the link for the current page. Each icon is an inline SVG; the visible label goes in `.nav-label`.

**Sidebar behaviour.** Below 900 px the sidebar slides in over the page. From 900 px up it is always visible, and the same button collapses it to icons only. The collapsed state is saved in `localStorage` (inside a `try/catch`) under the key `dash-sidebar-collapsed`.

**Charts.** `charts.js` draws one line chart and one bar chart from `{ label, value }` arrays. To add a chart, add a `.chart` container with `data-chart`, `data-title-id` and `data-summary-id`, then call `renderLineChart()` or `renderBarChart()` with your data. Axis limits are rounded up with `niceMax()`. The charts plot one series each, so they have no legend; the card heading names the series.

**Table.** The column keys in `orders.html` (`data-sort-key`) must match the property names of the order objects. Add a column by adding a `<th>` and a matching `cell()` call in `orders.js`.

## Connecting real data or a backend

1. **Replace `data.js`.** Load your data from your API, then assign the result to `window.DashboardData` before `charts.js` or `orders.js` run. Alternatively, change those scripts to `fetch()` the data and call their render functions when it arrives. Keep the same shapes:
   - `revenueByMonth` / `ordersByChannel`: `[{ label: string, value: number }]`
   - `metrics`: `[{ label, value, change, trend: "up" | "down" }]` (the values are display strings)
   - `orders`: `[{ id, customer, email, date: "YYYY-MM-DD", channel, items, total, status }]`
2. **Large datasets.** Client-side filtering is fine for a few thousand rows. Beyond that, send `query`, `status`, `sortKey`, `sortDir`, `page` and `pageSize` to your server and render the page it returns. `logic.js` shows the expected behaviour: clamped pages, 1-based row ranges and stable sorting.
3. **Search.** The top-bar search is a real GET form (`orders.html?q=…`), so it works from any page. `orders.js` reads the `q` parameter.
4. **Settings forms.** `app.js` intercepts submit and shows "Saved (demo only)". Replace that block with a `fetch()` to your API. Validate everything again on the server, and apply password and two-factor rules there, not only in the browser.
5. **Authentication.** There is none. Put the pages behind your own authentication and authorisation before any real data is shown.
6. **Escaping.** The table and charts insert data with `textContent`, so values are never interpreted as HTML. Keep it that way when you add columns.

## Accessibility notes

- Each page has a skip link, landmarks (`aside` with a labelled `nav`, a `header` top bar, and `main`), one `h1`, and headings in order.
- The sidebar button keeps `aria-expanded` and its label in sync. On small screens the hidden sidebar is `inert`, so keyboard focus cannot land in it. Opening it moves focus to the first link, and <kbd>Esc</kbd> or a click on the backdrop closes it.
- In the collapsed sidebar the link labels are visually hidden but still read by screen readers. Each link also has a `title` tooltip.
- **Charts:** each SVG has `role="img"`, is labelled by its card heading and described by a generated text summary (start, end, % change, highest and lowest month). Each chart also has a "Show data table" disclosure containing a real `<table>`. Hover tooltips are extra; the same values are in the table.
- **Orders table:** a `caption`, `scope` on header cells, and sort buttons inside the headers with `aria-sort` on the sorted column. The "Showing X–Y of Z" line is a `role="status"` live region. Pagination buttons have labels such as "Page 3", and the current page has `aria-current="page"`.
- **Tabs:** the WAI-ARIA tabs pattern, with arrow keys, <kbd>Home</kbd>/<kbd>End</kbd> and roving `tabindex`. Panels have `role="tabpanel"` and are labelled by their tab.
- **Toggles:** native checkboxes with `role="switch"`, a visible `<label>`, and a description linked with `aria-describedby`.
- Status badges always show their text; colour is never the only signal.
- We calculated contrast for the token pairs (text, muted text, sidebar, buttons, all five badge styles, chart line, input borders) and all meet 4.5:1 for text or 3:1 for graphics and borders.

## Browser support

The kit is written for current versions of Chrome, Edge, Firefox and Safari. It uses CSS Grid, custom properties, `:focus-visible`, the `inert` attribute, `Intl.NumberFormat` (including compact notation for axis labels), `URLSearchParams` and `matchMedia`.

**What was actually checked:**

- `npx html-validate` with `html-validate:recommended` reports 0 errors on all three pages.
- `node --check` passes on every JS file.
- `logic.js` and the sample data passed 15 Node assertions. These covered filtering, sorting, stability, pagination edge cases and chart geometry. They also confirmed that the headline metrics match the sample data.
- All three pages were loaded in jsdom 30 (a simulated DOM, not a real browser) and the scripts ran with no errors. The tests checked that both charts render, with 12 points and 4 bars, and that the summaries contain the expected text. They also exercised the sidebar open/close and `inert`, table paging, sorting both ways, the status filter, the empty state, the `?q=` prefill, tab switching by click and arrow key, and the demo form save.
- All internal links and id references resolve.

**Not checked:** the kit has not been tested by hand in a real browser, at real screen widths (the layout is built for 320–1440 px), or with a screen reader. Do that before you ship.

## Licence

See `LICENSE.txt`. The kit contains no third-party code, fonts or images.

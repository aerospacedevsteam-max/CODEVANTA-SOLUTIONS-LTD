/*
 * data.js — FICTIONAL sample data for the Admin Dashboard Starter.
 * Every name, email address and figure below is invented for demonstration.
 * Emails use the reserved example.com domain. Replace this file (or the
 * values it exposes on window.DashboardData) with data from your own API.
 */
window.DashboardData = {
  currency: "USD",

  /* Monthly revenue for the line chart (store: "Brindlewood Supply Co.", fictional). */
  revenueByMonth: [
    { label: "Nov", value: 18420 },
    { label: "Dec", value: 24610 },
    { label: "Jan", value: 16980 },
    { label: "Feb", value: 17850 },
    { label: "Mar", value: 20340 },
    { label: "Apr", value: 21970 },
    { label: "May", value: 23150 },
    { label: "Jun", value: 22480 },
    { label: "Jul", value: 25890 },
    { label: "Aug", value: 27310 },
    { label: "Sep", value: 26040 },
    { label: "Oct", value: 29760 }
  ],

  /* Orders by sales channel for the bar chart (last 30 days). */
  ordersByChannel: [
    { label: "Web", value: 412 },
    { label: "Mobile app", value: 296 },
    { label: "Marketplace", value: 174 },
    { label: "Phone", value: 58 }
  ],

  /* Headline metrics for the overview cards. */
  metrics: [
    { label: "Revenue (30 days)", value: "$29,760", change: "+14.3%", trend: "up" },
    { label: "Orders (30 days)", value: "940", change: "+6.1%", trend: "up" },
    { label: "Average order value", value: "$31.66", change: "+7.7%", trend: "up" },
    { label: "Refund rate", value: "1.8%", change: "-0.4 pts", trend: "down" }
  ],

  /* Orders table sample (48 rows). status: Paid | Pending | Shipped | Refunded | Cancelled */
  orders: [
    {"id":"SO-10231","customer":"Linus Overend","email":"linus.overend@example.com","date":"2026-07-11","channel":"Web","items":3,"total":255.06,"status":"Paid"},
    {"id":"SO-10232","customer":"Corin Penhallow","email":"corin.penhallow@example.com","date":"2026-07-26","channel":"Phone","items":4,"total":48.76,"status":"Paid"},
    {"id":"SO-10233","customer":"Elodie Halloway","email":"elodie.halloway@example.com","date":"2026-08-20","channel":"Mobile app","items":2,"total":36.03,"status":"Cancelled"},
    {"id":"SO-10234","customer":"Juno Ditchling","email":"juno.ditchling@example.com","date":"2026-09-25","channel":"Web","items":3,"total":276.15,"status":"Paid"},
    {"id":"SO-10235","customer":"Pax Bellweather","email":"pax.bellweather@example.com","date":"2026-08-10","channel":"Web","items":4,"total":170.59,"status":"Paid"},
    {"id":"SO-10236","customer":"Mabel Penhallow","email":"mabel.penhallow@example.com","date":"2026-07-08","channel":"Phone","items":2,"total":436.38,"status":"Paid"},
    {"id":"SO-10237","customer":"Corin Penhallow","email":"corin.penhallow@example.com","date":"2026-09-07","channel":"Marketplace","items":1,"total":119.46,"status":"Paid"},
    {"id":"SO-10238","customer":"Avery Penhallow","email":"avery.penhallow@example.com","date":"2026-08-31","channel":"Marketplace","items":6,"total":167.97,"status":"Pending"},
    {"id":"SO-10239","customer":"Linus Larkspur","email":"linus.larkspur@example.com","date":"2026-08-10","channel":"Mobile app","items":2,"total":125.62,"status":"Paid"},
    {"id":"SO-10240","customer":"Odessa Wick","email":"odessa.wick@example.com","date":"2026-09-16","channel":"Phone","items":6,"total":424.99,"status":"Shipped"},
    {"id":"SO-10241","customer":"Saffi Fernsby","email":"saffi.fernsby@example.com","date":"2026-07-30","channel":"Mobile app","items":2,"total":200.91,"status":"Shipped"},
    {"id":"SO-10242","customer":"Odessa Bellweather","email":"odessa.bellweather@example.com","date":"2026-07-01","channel":"Mobile app","items":4,"total":223.74,"status":"Paid"},
    {"id":"SO-10243","customer":"Linus Larkspur","email":"linus.larkspur@example.com","date":"2026-08-22","channel":"Mobile app","items":1,"total":392.74,"status":"Pending"},
    {"id":"SO-10244","customer":"Avery Halloway","email":"avery.halloway@example.com","date":"2026-09-02","channel":"Marketplace","items":4,"total":429.4,"status":"Paid"},
    {"id":"SO-10245","customer":"Pax Fernsby","email":"pax.fernsby@example.com","date":"2026-07-08","channel":"Web","items":4,"total":410.75,"status":"Paid"},
    {"id":"SO-10246","customer":"Linus Fernsby","email":"linus.fernsby@example.com","date":"2026-07-26","channel":"Mobile app","items":1,"total":182.72,"status":"Paid"},
    {"id":"SO-10247","customer":"Isla Halloway","email":"isla.halloway@example.com","date":"2026-07-15","channel":"Web","items":4,"total":53.45,"status":"Paid"},
    {"id":"SO-10248","customer":"Linus Penhallow","email":"linus.penhallow@example.com","date":"2026-07-01","channel":"Phone","items":3,"total":366.65,"status":"Pending"},
    {"id":"SO-10249","customer":"Rafe Crumb","email":"rafe.crumb@example.com","date":"2026-07-25","channel":"Mobile app","items":1,"total":434.92,"status":"Paid"},
    {"id":"SO-10250","customer":"Pax Marrow","email":"pax.marrow@example.com","date":"2026-07-03","channel":"Marketplace","items":3,"total":193.06,"status":"Shipped"},
    {"id":"SO-10251","customer":"Saffi Ditchling","email":"saffi.ditchling@example.com","date":"2026-07-11","channel":"Phone","items":4,"total":251.44,"status":"Refunded"},
    {"id":"SO-10252","customer":"Linus Bellweather","email":"linus.bellweather@example.com","date":"2026-09-18","channel":"Mobile app","items":3,"total":349.34,"status":"Refunded"},
    {"id":"SO-10253","customer":"Saffi Bellweather","email":"saffi.bellweather@example.com","date":"2026-08-27","channel":"Phone","items":3,"total":48.22,"status":"Shipped"},
    {"id":"SO-10254","customer":"Elodie Penhallow","email":"elodie.penhallow@example.com","date":"2026-09-06","channel":"Phone","items":4,"total":225.12,"status":"Refunded"},
    {"id":"SO-10255","customer":"Avery Penhallow","email":"avery.penhallow@example.com","date":"2026-08-12","channel":"Phone","items":4,"total":85.98,"status":"Paid"},
    {"id":"SO-10256","customer":"Wren Overend","email":"wren.overend@example.com","date":"2026-07-29","channel":"Web","items":6,"total":258.93,"status":"Paid"},
    {"id":"SO-10257","customer":"Pax Crumb","email":"pax.crumb@example.com","date":"2026-07-21","channel":"Marketplace","items":2,"total":447.69,"status":"Pending"},
    {"id":"SO-10258","customer":"Quill Quistle","email":"quill.quistle@example.com","date":"2026-07-31","channel":"Mobile app","items":6,"total":284.84,"status":"Paid"},
    {"id":"SO-10259","customer":"Linus Marrow","email":"linus.marrow@example.com","date":"2026-08-06","channel":"Marketplace","items":2,"total":25.2,"status":"Paid"},
    {"id":"SO-10260","customer":"Linus Overend","email":"linus.overend@example.com","date":"2026-09-20","channel":"Web","items":3,"total":119.15,"status":"Paid"},
    {"id":"SO-10261","customer":"Pax Tansley","email":"pax.tansley@example.com","date":"2026-09-15","channel":"Web","items":4,"total":145.93,"status":"Paid"},
    {"id":"SO-10262","customer":"Rafe Ditchling","email":"rafe.ditchling@example.com","date":"2026-07-21","channel":"Marketplace","items":6,"total":467.03,"status":"Pending"},
    {"id":"SO-10263","customer":"Isla Penhallow","email":"isla.penhallow@example.com","date":"2026-07-08","channel":"Web","items":1,"total":359.49,"status":"Shipped"},
    {"id":"SO-10264","customer":"Odessa Penhallow","email":"odessa.penhallow@example.com","date":"2026-07-29","channel":"Web","items":6,"total":309.24,"status":"Shipped"},
    {"id":"SO-10265","customer":"Odessa Crumb","email":"odessa.crumb@example.com","date":"2026-07-12","channel":"Marketplace","items":6,"total":304.41,"status":"Paid"},
    {"id":"SO-10266","customer":"Saffi Overend","email":"saffi.overend@example.com","date":"2026-07-12","channel":"Mobile app","items":5,"total":368.73,"status":"Pending"},
    {"id":"SO-10267","customer":"Corin Penhallow","email":"corin.penhallow@example.com","date":"2026-07-08","channel":"Web","items":3,"total":454.77,"status":"Refunded"},
    {"id":"SO-10268","customer":"Linus Larkspur","email":"linus.larkspur@example.com","date":"2026-08-09","channel":"Web","items":6,"total":177.35,"status":"Paid"},
    {"id":"SO-10269","customer":"Avery Penhallow","email":"avery.penhallow@example.com","date":"2026-08-01","channel":"Phone","items":5,"total":306.85,"status":"Paid"},
    {"id":"SO-10270","customer":"Linus Halloway","email":"linus.halloway@example.com","date":"2026-08-13","channel":"Mobile app","items":2,"total":262.52,"status":"Paid"},
    {"id":"SO-10271","customer":"Corin Crumb","email":"corin.crumb@example.com","date":"2026-08-14","channel":"Web","items":1,"total":245.85,"status":"Paid"},
    {"id":"SO-10272","customer":"Corin Halloway","email":"corin.halloway@example.com","date":"2026-07-08","channel":"Mobile app","items":3,"total":333.86,"status":"Cancelled"},
    {"id":"SO-10273","customer":"Pax Fernsby","email":"pax.fernsby@example.com","date":"2026-09-14","channel":"Phone","items":6,"total":372.5,"status":"Shipped"},
    {"id":"SO-10274","customer":"Avery Marrow","email":"avery.marrow@example.com","date":"2026-08-25","channel":"Web","items":4,"total":189.9,"status":"Pending"},
    {"id":"SO-10275","customer":"Corin Halloway","email":"corin.halloway@example.com","date":"2026-08-31","channel":"Marketplace","items":1,"total":129.76,"status":"Paid"},
    {"id":"SO-10276","customer":"Avery Marrow","email":"avery.marrow@example.com","date":"2026-08-14","channel":"Marketplace","items":4,"total":464.69,"status":"Paid"},
    {"id":"SO-10277","customer":"Juno Halloway","email":"juno.halloway@example.com","date":"2026-07-14","channel":"Mobile app","items":1,"total":169.5,"status":"Paid"},
    {"id":"SO-10278","customer":"Odessa Wick","email":"odessa.wick@example.com","date":"2026-08-11","channel":"Marketplace","items":6,"total":334.55,"status":"Pending"}

  ]
};

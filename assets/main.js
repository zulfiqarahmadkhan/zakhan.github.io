/* ============================================================
   Site logic: theme toggle, data loading, page rendering.
   All content lives in /data/*.json — edit those, not this file.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Theme (day / night) ---------- */
  function storedTheme() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  function storeTheme(t) { try { localStorage.setItem("theme", t); } catch (e) { /* ignore */ } }
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var b = document.querySelector(".theme-toggle");
    if (b) b.setAttribute("aria-label", t === "dark" ? "Switch to day mode" : "Switch to night mode");
  }
  applyTheme(storedTheme() || currentTheme());
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".theme-toggle");
    if (!btn) return;
    var next = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(next); storeTheme(next);
  });

  /* ---------- Helpers ---------- */
  var ME = "Zulfiqar Ahmad Khan";
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel) { return document.querySelector(sel); }
  function getJSON(path) {
    return fetch(path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(path + " " + r.status);
      return r.json();
    });
  }
  function norm(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  function fmtNum(n) { return Number(n).toLocaleString("en-US"); }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  var ICONS = {
    scholar: '<path d="M12 3 1 9l11 6 9-4.9V17h2V9L12 3z"/><path d="M5 13.2v4.3c0 1.9 3.1 3.5 7 3.5s7-1.6 7-3.5v-4.3l-7 3.8-7-3.8z"/>',
    orcid: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 10h1.6v7H8zM8.8 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM11.5 10h2.7c2.2 0 3.6 1.4 3.6 3.5S16.4 17 14.2 17h-2.7v-7zm1.6 1.4v4.2h1c1.3 0 2.1-.8 2.1-2.1s-.8-2.1-2.1-2.1h-1z"/>',
    rg: '<rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><text x="12" y="16.2" text-anchor="middle" font-size="10" font-family="Inter,Arial,sans-serif" font-weight="700" fill="currentColor">RG</text>',
    uni: '<path d="M12 2 2 7v2h20V7L12 2zM4 11v7h3v-7H4zm6.5 0v7h3v-7h-3zM17 11v7h3v-7h-3zM2 20v2h20v-2H2z"/>',
    code: '<path d="m8.6 16.6-4.6-4.6 4.6-4.6L7.2 6 1.2 12l6 6 1.4-1.4zm6.8 0 4.6-4.6-4.6-4.6L16.8 6l6 6-6 6-1.4-1.4z"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7H4z"/>',
    mail: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 7.2L4.4 7H4v.6l8 5.5 8-5.5V7h-.4L12 12.2z"/>',
    download: '<path d="M12 3v11m0 0-4.5-4.5M12 14l4.5-4.5M4 17v3h16v-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  function entryHTML(e) {
    var title = e.url ? '<a href="' + esc(e.url) + '">' + esc(e.title) + "</a>" : esc(e.title);
    var h = '<div class="entry"><div class="date">' + esc(e.dates) + '</div><div>';
    h += '<div class="title">' + title + "</div>";
    if (e.org) h += '<div class="org">' + esc(e.org);
    if (e.links) h += " (" + e.links.map(function (l) { return '<a href="' + esc(l.url) + '">' + esc(l.label) + "</a>"; }).join(", ") + ")";
    if (e.org) h += "</div>";
    if (e.detail) {
      var d = e.detail_url ? '<a href="' + esc(e.detail_url) + '">' + esc(e.detail) + "</a>" : esc(e.detail);
      if (e.extra_link) d += ' (<a href="' + esc(e.extra_link.url) + '">' + esc(e.extra_link.label) + "</a>)";
      h += '<div class="detail">' + d + "</div>";
    }
    if (e.bullets && e.bullets.length) h += "<ul>" + e.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>";
    return h + "</div></div>";
  }
  function fill(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }

  /* ---------- About page ---------- */
  function renderAbout(p, sch) {
    var photo = $("#avatar");
    if (photo) {
      var img = new Image();
      img.alt = p.name; img.className = "avatar";
      img.onload = function () { photo.replaceWith(img); };
      img.src = p.photo;
    }
    fill("name", esc(p.name));
    fill("role", esc(p.position) + " · " + esc(p.department));
    fill("org", esc(p.institution));
    fill("links", p.links.filter(function (l) { return l.url; }).map(function (l) {
      return '<a href="' + esc(l.url) + '">' + icon(l.icon) + esc(l.label) + "</a>";
    }).join(""));
    fill("bio", p.bio.map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("") +
      '<div class="chips">' + p.interests.map(function (t) { return '<span class="chip">' + esc(t) + "</span>"; }).join("") + "</div>");

    var live = !!sch.updated;
    var m = [
      { v: sch.citations_label || fmtNum(sch.citations), l: "Citations", s: sch.citations_since != null ? fmtNum(sch.citations_since) + " since " + sch.since_year : "", live: live },
      { v: sch.h_index, l: "h-index", s: sch.h_index_since != null ? sch.h_index_since + " since " + sch.since_year : "", live: live },
      { v: sch.i10_index + (live ? "" : "+"), l: "i10-index", s: sch.i10_index_since != null ? sch.i10_index_since + " since " + sch.since_year : "", live: live }
    ].concat(p.static_metrics.map(function (x) { return { v: x.value, l: x.label, s: "" }; }));
    fill("metrics", m.map(function (x) {
      return '<div class="metric' + (x.live ? " live" : "") + '"><div class="v">' + esc(x.v) + '</div><div class="l">' + esc(x.l) + "</div>" +
        (x.s ? '<div class="s">' + esc(x.s) + "</div>" : "") + "</div>";
    }).join(""));
    fill("metrics-note", live
      ? 'Citations, h-index and i10-index from <a href="https://scholar.google.com/citations?user=' + esc(sch.scholar_id) + '">Google Scholar</a>, updated ' + esc(fmtDate(sch.updated)) + "."
      : "Google Scholar figures will appear here automatically after the first daily update.");

    var years = Object.keys(sch.cites_per_year || {}).sort();
    var chart = $("#chart");
    if (chart && years.length) {
      var max = Math.max.apply(null, years.map(function (y) { return sch.cites_per_year[y]; }));
      chart.hidden = false;
      fill("bars", years.map(function (y) {
        var n = sch.cites_per_year[y];
        return '<div class="bar" title="' + y + ": " + n + ' citations"><span class="n">' + n + '</span><div class="col" style="height:' +
          Math.max(2, Math.round((n / max) * 100)) + '%"></div><span class="y">' + y + "</span></div>";
      }).join(""));
    }
    fill("education", p.education.map(entryHTML).join(""));
    fill("awards", p.awards.map(entryHTML).join(""));
    fill("recognition", p.recognition.map(entryHTML).join(""));
  }

  /* ---------- CV page ---------- */
  function renderCV(p) {
    var dl = $("#download");
    if (dl) dl.href = p.cv_pdf;
    var rs = $("#download-resume");
    if (rs) { if (p.resume_pdf) rs.href = p.resume_pdf; else rs.hidden = true; }
    fill("cv-contact", esc(p.position) + ", " + esc(p.department) + ", " + esc(p.institution) +
      ' · <a href="mailto:' + esc(p.email) + '">' + esc(p.email) + "</a>");
    fill("cv-education", p.education.map(entryHTML).join(""));
    fill("cv-experience", p.experience.map(entryHTML).join(""));
    fill("cv-projects", p.projects.map(entryHTML).join(""));
    fill("cv-awards", p.awards.concat(p.recognition).map(entryHTML).join(""));
    fill("cv-skills", p.skills.map(function (s) { return "<dt>" + esc(s.label) + "</dt><dd>" + esc(s.value) + "</dd>"; }).join(""));
    fill("cv-service", "<p>" + esc(p.service) + "</p>");
  }

  /* ---------- Publications page ---------- */
  var TYPES = [
    { key: "all", label: "All" },
    { key: "journal", label: "Journal articles", prefix: "J" },
    { key: "conference", label: "Conference papers", prefix: "C" },
    { key: "submitted", label: "Under review", prefix: "S" },
    { key: "patent", label: "Patents", prefix: "P" }
  ];
  function renderPubs(pubs, journals, sch) {
    // numbering per type, in the order of the data file (newest first)
    var counters = {};
    pubs.forEach(function (x) {
      counters[x.type] = (counters[x.type] || 0) + 1;
      var t = TYPES.filter(function (k) { return k.key === x.type; })[0];
      x.label = (t ? t.prefix : "") + counters[x.type];
      x.order = pubs.indexOf(x);
    });
    // match Google Scholar citation counts by title
    var cites = {};
    (sch.publications || []).forEach(function (s) { cites[norm(s.title)] = s.citations; });
    pubs.forEach(function (x) {
      var k = norm(x.title);
      if (k in cites) { x.citations = cites[k]; return; }
      for (var t in cites) {
        if (t.length > 25 && (t.indexOf(k.slice(0, 40)) === 0 || k.indexOf(t.slice(0, 40)) === 0)) { x.citations = cites[t]; return; }
      }
    });

    var state = { type: "all", q: "", sort: "year" };
    fill("tabs", TYPES.map(function (t) {
      var n = t.key === "all" ? pubs.length : pubs.filter(function (x) { return x.type === t.key; }).length;
      return '<button class="tab" data-type="' + t.key + '" aria-pressed="' + (t.key === "all") + '">' + esc(t.label) + '<span class="c">' + n + "</span></button>";
    }).join(""));
    $("#tabs").addEventListener("click", function (e) {
      var b = e.target.closest(".tab"); if (!b) return;
      state.type = b.getAttribute("data-type");
      Array.prototype.forEach.call(document.querySelectorAll(".tab"), function (x) { x.setAttribute("aria-pressed", x === b); });
      draw();
    });
    $("#search").addEventListener("input", function (e) { state.q = e.target.value.toLowerCase(); draw(); });
    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; draw(); });

    function badges(x) {
      var h = "";
      if (x.citations != null) h += '<span class="badge cite">Cited by ' + fmtNum(x.citations) + "</span>";
      var j = x.type === "journal" ? journals[x.venue] : null;
      if (j && j.quartile) h += '<span class="badge ' + esc(j.quartile.toLowerCase()) + '">' + esc(j.quartile) + "</span>";
      if (j && j.impact_factor) h += '<span class="badge">IF ' + esc(j.impact_factor) + "</span>";
      if (x.status && x.type !== "journal") {
        var st = x.status;
        if (x.type === "submitted") st = /major revision/i.test(st) ? "Major revision" : /under review/i.test(st) ? "Under review" : "Submitted";
        h += '<span class="badge status">' + esc(st) + "</span>";
      }
      return h ? '<div class="badges">' + h + "</div>" : "";
    }
    function item(x) {
      var authors = x.authors.map(function (a) { return a === ME ? "<b>" + esc(a) + "</b>" : esc(a); }).join(", ");
      var title = x.url ? '<a href="' + esc(x.url) + '">' + esc(x.title) + "</a>" : esc(x.title);
      var venue = x.venue ? (x.venue_url ? '<a href="' + esc(x.venue_url) + '">' + esc(x.venue) + "</a>" : esc(x.venue)) : "";
      if (venue && x.year && x.type !== "submitted" && x.type !== "patent") venue += ", " + x.year;
      return '<li class="pub"><div class="num">[' + x.label + ']</div><div>' +
        '<div class="t">' + title + "</div>" +
        '<div class="a">' + authors + "</div>" +
        (venue ? '<div class="v">' + venue + "</div>" : "") + badges(x) + "</div></li>";
    }
    function draw() {
      var list = pubs.filter(function (x) {
        if (state.type !== "all" && x.type !== state.type) return false;
        if (!state.q) return true;
        return (x.title + " " + x.authors.join(" ") + " " + x.venue).toLowerCase().indexOf(state.q) !== -1;
      });
      if (!list.length) { fill("pub-list", '<p class="empty">No publications match your search.</p>'); return; }
      if (state.sort === "citations") {
        list = list.slice().sort(function (a, b) { return (b.citations || 0) - (a.citations || 0) || a.order - b.order; });
        fill("pub-list", '<ol class="pubs">' + list.map(item).join("") + "</ol>");
        return;
      }
      var html = "", year = "start";
      list.forEach(function (x, i) {
        var y = x.type === "submitted" ? "Under review" : x.type === "patent" ? "Patents" : (x.year || "Other");
        if (y !== year) {
          if (i) html += "</ol>";
          html += '<h2 class="year">' + esc(y) + '</h2><ol class="pubs">';
          year = y;
        }
        html += item(x);
      });
      fill("pub-list", html + "</ol>");
    }
    draw();
    fill("pub-note", (sch.updated
      ? 'Citation counts from <a href="https://scholar.google.com/citations?user=' + esc(sch.scholar_id) + '">Google Scholar</a>, updated ' + esc(fmtDate(sch.updated)) + ". "
      : "Citation counts appear automatically after the first daily Google Scholar update. ") +
      "Journal quartile (Q) and impact factor (IF) are maintained in data/journals.json.");
  }

  /* ---------- Boot ---------- */
  var page = document.body.getAttribute("data-page");
  var yr = document.getElementById("year"); if (yr) yr.textContent = new Date().getFullYear();
  function fail(err) {
    console.error(err);
    var m = document.getElementById("load-error");
    if (m) m.hidden = false;
  }
  if (page === "about") {
    Promise.all([getJSON("data/profile.json"), getJSON("data/scholar.json")]).then(function (r) { renderAbout(r[0], r[1]); }).catch(fail);
  } else if (page === "cv") {
    getJSON("data/profile.json").then(renderCV).catch(fail);
  } else if (page === "publications") {
    Promise.all([getJSON("data/publications.json"), getJSON("data/journals.json"), getJSON("data/scholar.json")])
      .then(function (r) { renderPubs(r[0], r[1], r[2]); }).catch(fail);
  }
})();

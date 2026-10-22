// The only script on the site, and the site works without it. It does what
// a static page cannot: says how long ago something was published, shows
// like counts newer than the last build, opens a chirp when its card is
// clicked, loads older chirps as you scroll, and turns a draft into the git
// command that posts it.
//
// Like counts come from GitHub's public API without signing in. That allows
// 60 requests an hour per visitor, so the answer is kept for five minutes.
(function () {
  "use strict";

  var minute = 60 * 1000, hour = 60 * minute, day = 24 * hour;

  function ago(date) {
    var elapsed = Date.now() - date.getTime();
    if (elapsed < minute) return "now";
    if (elapsed < hour) return Math.floor(elapsed / minute) + "m";
    if (elapsed < day) return Math.floor(elapsed / hour) + "h";
    if (elapsed < 7 * day) return Math.floor(elapsed / day) + "d";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  var formats = {
    full: function (date) {
      return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) + " · " +
        date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    },
    month: function (date) {
      return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    },
    ago: ago
  };

  function times() {
    document.querySelectorAll("time[datetime]").forEach(function (time) {
      var date = new Date(time.getAttribute("datetime"));
      if (isNaN(date)) return;
      time.title = date.toLocaleString();
      time.textContent = formats[time.getAttribute("data-format") || "ago"](date);
    });
  }

  // A click anywhere on a card that is not a link, and not the end of a
  // text selection, opens the chirp.
  function clickableCards() {
    document.addEventListener("click", function (event) {
      var card = event.target.closest(".chirp[data-href]");
      if (!card || event.target.closest("a") || String(window.getSelection())) return;
      window.location.href = card.getAttribute("data-href");
    });
  }

  // Shell-quotes a draft so it survives being pasted into a terminal.
  function quoted(text) {
    return "'" + text.replace(/'/g, "'\\''") + "'";
  }

  function composer() {
    var draft = document.getElementById("draft");
    if (!draft) return;
    var command = document.getElementById("command");
    var counter = document.getElementById("counter");
    var copy = document.getElementById("copy");
    function update() {
      var text = draft.value.trim();
      var left = 280 - Array.from(draft.value).length;
      command.textContent = "git chirp " + (text ? quoted(text) : "\"…\"");
      counter.textContent = left;
      counter.classList.toggle("over", left < 0);
      copy.disabled = !text || left < 0;
    }
    draft.addEventListener("input", update);
    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(command.textContent).then(function () {
        copy.textContent = "Copied";
        setTimeout(function () { copy.textContent = "Copy command"; }, 1500);
      });
    });
    update();
  }

  // Infinite scroll: when the "Show older chirps" link comes into view, fetch
  // the page it points at and append its chirps here. Chirps already shown
  // are skipped, since the newest page and the next older one can overlap.
  // Without this the link simply works as a link.
  function olderOnScroll() {
    if (!("IntersectionObserver" in window)) return;
    var loading = false;
    var observer = new IntersectionObserver(function (entries) {
      var link = entries[0].isIntersecting && entries[0].target;
      if (!link || loading) return;
      loading = true;
      fetch(link.href)
        .then(function (response) { return response.ok ? response.text() : Promise.reject(); })
        .then(function (html) {
          var older = new DOMParser().parseFromString(html, "text/html");
          var feed = document.querySelector(".feed");
          older.querySelectorAll(".feed .chirp").forEach(function (chirp) {
            if (!document.getElementById(chirp.id)) feed.appendChild(document.importNode(chirp, true));
          });
          var next = older.querySelector("a.older");
          observer.unobserve(link);
          if (next) {
            link.href = next.getAttribute("href");
            observer.observe(link);
          } else {
            link.remove();
          }
          times();
          loading = false;
        })
        .catch(function () { observer.unobserve(link); });
    }, { rootMargin: "600px" });
    var link = document.querySelector("a.older");
    if (link) observer.observe(link);
  }

  function remembered(key) {
    try {
      var saved = JSON.parse(sessionStorage.getItem(key) || "null");
      return saved && Date.now() - saved.at < 5 * minute ? saved.counts : null;
    } catch (e) {
      return null;
    }
  }

  function remember(key, counts) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), counts: counts }));
    } catch (e) { /* private browsing: just ask again next time */ }
  }

  // The newest 100 merged pull requests and their reaction totals.
  function fetchCounts(repository) {
    var url = "https://api.github.com/repos/" + repository +
      "/issues?state=closed&sort=created&direction=desc&per_page=100";
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (response) { return response.ok ? response.json() : []; })
      .then(function (issues) {
        var counts = {};
        issues.forEach(function (issue) {
          if (issue.pull_request && issue.reactions) counts[issue.number] = issue.reactions.total_count;
        });
        return counts;
      });
  }

  function showCounts(counts) {
    document.querySelectorAll(".likes[data-number]").forEach(function (link) {
      var count = counts[link.getAttribute("data-number")];
      if (count !== undefined) link.querySelector(".count").textContent = count;
    });
  }

  function liveLikes() {
    var repository = document.body.getAttribute("data-repository");
    if (!repository || !document.querySelector(".likes[data-number]")) return;
    var key = "gitchirip-likes:" + repository;
    var counts = remembered(key);
    if (counts) return showCounts(counts);
    fetchCounts(repository)
      .then(function (fresh) {
        remember(key, fresh);
        showCounts(fresh);
      })
      .catch(function () { /* offline or rate limited: the built counts stay */ });
  }

  times();
  liveLikes();
  clickableCards();
  composer();
  olderOnScroll();
})();

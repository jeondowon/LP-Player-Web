const YT_API_KEY = "AIzaSyBhMKCZ2E9uVV1M8Qd4w43U5cSCLODAgdw";

const S = {
  playlist: [], currentIndex: -1, isPlaying: false,
  isAnimating: false, ytReady: false, ytPlayer: null,
  volume: 80, muted: false,
};

// ── YOUTUBE ──
window.onYouTubeIframeAPIReady = function () {
  S.ytPlayer = new YT.Player("yt-player", {
    height: "1", width: "1",
    playerVars: { autoplay: 0, controls: 0, origin: location.origin },
    events: {
      onReady: () => { S.ytReady = true; S.ytPlayer.setVolume(S.volume); },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) { S.isPlaying = true; updPlayBtn(); updNpArt(); }
        else if (e.data === YT.PlayerState.PAUSED) { S.isPlaying = false; updPlayBtn(); updNpArt(); }
        else if (e.data === YT.PlayerState.ENDED) nextTrack();
        else if (e.data === YT.PlayerState.UNSTARTED) {
          setTimeout(() => {
            try {
              if (S.ytPlayer.getPlayerState() === YT.PlayerState.UNSTARTED && S.isPlaying) {
                showToast("재생 불가 — 다음 곡으로 이동합니다");
                nextTrack();
              }
            } catch (e) {}
          }, 800);
        }
      },
    },
  });
};

async function searchYT(q) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(q)}&key=${YT_API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) { const err = await r.json(); throw new Error(err.error?.message || "API error"); }
  const d = await r.json();
  return (d.items || []).map((item) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || "",
  }));
}

// ── PLAYBACK ──
function playTrack(idx) {
  if (idx < 0 || idx >= S.playlist.length) return;
  const track = S.playlist[idx], prev = S.currentIndex;
  S.currentIndex = idx;
  updNowPlaying(track); updShelfActive(idx); updListActive(idx);
  const doPlay = () => {
    if (!S.ytReady) { showToast("Player loading..."); return; }
    S.ytPlayer.loadVideoById(track.videoId);
    S.isPlaying = true; updPlayBtn(); updNpArt();
  };
  prev !== idx ? swapVinyl(track, doPlay) : doPlay();
}

function togglePlay() {
  if (S.currentIndex === -1 && S.playlist.length) { playTrack(0); return; }
  if (!S.ytReady || S.currentIndex === -1) return;
  if (S.isAnimating) return;
  try {
    const ps = S.ytPlayer.getPlayerState();
    if (ps === YT.PlayerState.PLAYING) S.ytPlayer.pauseVideo();
    else S.ytPlayer.playVideo();
  } catch (e) { console.warn(e); }
}

function nextTrack() { if (S.playlist.length) playTrack((S.currentIndex + 1) % S.playlist.length); }
function prevTrack() { if (S.playlist.length) playTrack((S.currentIndex - 1 + S.playlist.length) % S.playlist.length); }
function updPlayBtn() { document.getElementById("play-btn").textContent = S.isPlaying ? "⏸" : "▶"; }
function updNpArt() {
  const a = document.getElementById("np-art");
  S.isPlaying ? a.classList.add("playing") : a.classList.remove("playing");
}

function updNowPlaying(t) {
  const trackEl = document.getElementById("np-track");
  trackEl.innerHTML = marqueeHTML(t.title);
  document.getElementById("np-artist").textContent = t.channel;
  document.getElementById("np-art").src = t.thumbnail || "";
  document.getElementById("now-playing").classList.add("visible");
  setTimeout(() => applyMarquee(trackEl.querySelector(".marquee-wrap")), 50);
}

// ── PLAYLIST ──
function addTrack(t) {
  if (S.playlist.find((x) => x.videoId === t.videoId)) { showToast("Already in playlist"); return; }
  S.playlist.push(t); renderList(); renderShelf();
  showToast("Added: " + t.title.slice(0, 30) + "...");
}
function removeTrack(i) {
  const was = i === S.currentIndex;
  S.playlist.splice(i, 1);
  if (was) {
    if (S.ytReady) S.ytPlayer.stopVideo();
    S.isPlaying = false; S.currentIndex = -1; updPlayBtn();
    document.getElementById("now-playing").classList.remove("visible");
  } else if (i < S.currentIndex) S.currentIndex--;
  renderList(); renderShelf();
}
function renderList() {
  const c = document.getElementById("playlist-tracks");
  if (!S.playlist.length) {
    c.innerHTML = '<div class="playlist-empty">Search for tracks above<br>and build your playlist.</div>';
    return;
  }
  c.innerHTML = S.playlist.map((t, i) => `
    <div class="track-item${i === S.currentIndex ? " active" : ""}" data-i="${i}">
      <img src="${t.thumbnail}" alt="" onerror="this.style.opacity=0">
      <div class="ti-info"><div class="ti-name">${marqueeHTML(t.title)}</div><div class="ti-ch">${t.channel}</div></div>
      <button class="ti-rm" data-r="${i}">✕</button>
    </div>`).join("");
  c.querySelectorAll(".track-item").forEach((el) =>
    el.addEventListener("click", (e) => { if (e.target.dataset.r !== undefined) return; playTrack(+el.dataset.i); })
  );
  c.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => removeTrack(+b.dataset.r)));
  setTimeout(() => c.querySelectorAll(".ti-name .marquee-wrap").forEach(applyMarquee), 50);
}
function updListActive(i) {
  document.querySelectorAll(".track-item").forEach((el, j) => el.classList.toggle("active", j === i));
}

// ── SHELF ──
function renderShelf() {
  const c = document.getElementById("shelf-track");
  if (!S.playlist.length) { c.innerHTML = ""; return; }
  c.innerHTML = S.playlist.map((t, i) => `
    <div class="shelf-lp${i === S.currentIndex ? " active" : ""}" data-i="${i}">
      <div class="shelf-lp-disc">
        <img class="shelf-lp-art" src="${t.thumbnail}" alt="" onerror="this.style.opacity=0">
        <div class="shelf-lp-hole"></div>
      </div>
      <div class="shelf-lp-title">${marqueeHTML(t.title)}</div>
    </div>`).join("");
  c.querySelectorAll(".shelf-lp").forEach((el) => el.addEventListener("click", () => playTrack(+el.dataset.i)));
  setTimeout(() => c.querySelectorAll(".shelf-lp-title .marquee-wrap").forEach(applyMarquee), 50);
}
function updShelfActive(i) {
  document.querySelectorAll(".shelf-lp").forEach((el, j) => el.classList.toggle("active", j === i));
}

// Shelf drag scroll
let sd = false, sdx = 0, ssl = 0;
const ST = document.getElementById("shelf-track");
ST.addEventListener("mousedown", (e) => { sd = true; sdx = e.pageX - ST.offsetLeft; ssl = ST.scrollLeft; });
ST.addEventListener("mouseleave", () => (sd = false));
ST.addEventListener("mouseup", () => (sd = false));
ST.addEventListener("mousemove", (e) => { if (!sd) return; e.preventDefault(); ST.scrollLeft = ssl - (e.pageX - ST.offsetLeft - sdx); });

// ── SEARCH ──
let srData = [];
const SI = document.getElementById("search-input"),
  SB = document.getElementById("search-btn"),
  SR = document.getElementById("search-results");

async function doSearch() {
  const q = SI.value.trim(); if (!q) return;
  SB.textContent = "..."; SB.disabled = true;
  try {
    srData = await searchYT(q);
    SR.innerHTML = srData.length
      ? srData.map((t, i) => `
        <div class="search-item" data-i="${i}">
          <img src="${t.thumbnail}" alt="">
          <div class="si-info"><div class="si-title">${t.title}</div><div class="si-ch">${t.channel}</div></div>
          <button class="si-add" data-i="${i}">+</button>
        </div>`).join("")
      : '<div class="playlist-empty">No results.</div>';
    SR.style.display = "block";
    SR.querySelectorAll(".si-add").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); addTrack(srData[+b.dataset.i]); }));
    SR.querySelectorAll(".search-item").forEach((el, i) => el.addEventListener("click", (e) => { if (e.target.classList.contains("si-add")) return; addTrack(srData[i]); }));
  } catch (err) { showToast("Search failed: " + err.message); }
  SB.textContent = "Search"; SB.disabled = false;
}

SB.addEventListener("click", doSearch);
SI.addEventListener("keydown", (e) => e.key === "Enter" && doSearch());

document.getElementById("clear-btn").addEventListener("click", () => {
  if (S.ytReady) S.ytPlayer.stopVideo();
  S.playlist = []; S.currentIndex = -1; S.isPlaying = false; updPlayBtn();
  document.getElementById("now-playing").classList.remove("visible");
  renderList(); renderShelf();
  lctx.fillStyle = "#2a1408"; lctx.beginPath(); lctx.arc(256, 256, 256, 0, Math.PI * 2); lctx.fill();
  lTex.needsUpdate = true;
  showToast("Playlist cleared");
});

document.getElementById("play-btn").addEventListener("click", togglePlay);
document.getElementById("prev-btn").addEventListener("click", prevTrack);
document.getElementById("next-btn").addEventListener("click", nextTrack);

// ── VOLUME ──
document.getElementById("vol-slider").addEventListener("input", (e) => {
  S.volume = +e.target.value;
  if (S.muted && S.volume > 0) S.muted = false;
  if (S.ytReady) S.ytPlayer.setVolume(S.muted ? 0 : S.volume);
  updVolIcon();
});

function updVolIcon() {
  const v = S.muted ? 0 : S.volume;
  const w1 = document.getElementById("vol-wave1");
  const w2 = document.getElementById("vol-wave2");
  const ml = document.getElementById("vol-mute-line");
  if (S.muted || v === 0) { w1.style.display = "none"; w2.style.display = "none"; ml.style.display = ""; }
  else if (v < 70) { w1.style.display = ""; w2.style.display = "none"; ml.style.display = "none"; }
  else { w1.style.display = ""; w2.style.display = ""; ml.style.display = "none"; }
}

function toggleMute() {
  if (S.muted) {
    S.muted = false;
    document.getElementById("vol-slider").value = S.volume;
    if (S.ytReady) S.ytPlayer.setVolume(S.volume);
  } else {
    S.muted = true;
    if (S.ytReady) S.ytPlayer.setVolume(0);
  }
  updVolIcon();
}

document.getElementById("vol-icon").addEventListener("click", toggleMute);
document.addEventListener("click", (e) => { if (!e.target.closest("#playlist-panel")) SR.style.display = "none"; });

// ── 키보드 단축키 ──
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  if (e.code === "KeyM") { e.preventDefault(); toggleMute(); }
});

// ── PROGRESS BAR ──
function fmtTime(sec) {
  if (isNaN(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
const progressEl = document.getElementById("np-progress");
const timeCurEl = document.getElementById("np-time-cur");
const timeTotEl = document.getElementById("np-time-tot");
let progressDragging = false;
progressEl.addEventListener("mousedown", () => (progressDragging = true));
window.addEventListener("mouseup", () => (progressDragging = false));
progressEl.addEventListener("input", () => {
  if (!S.ytReady || S.currentIndex === -1) return;
  const dur = S.ytPlayer.getDuration();
  if (dur) S.ytPlayer.seekTo((progressEl.value / 100) * dur, true);
});
setInterval(() => {
  if (!S.ytReady || !S.isPlaying || progressDragging) return;
  try {
    const cur = S.ytPlayer.getCurrentTime() || 0;
    const dur = S.ytPlayer.getDuration() || 0;
    timeCurEl.textContent = fmtTime(cur);
    timeTotEl.textContent = fmtTime(dur);
    if (dur > 0) progressEl.value = (cur / dur) * 100;
  } catch (e) {}
}, 500);

// ── MARQUEE ──
function marqueeHTML(title) {
  return `<span class="marquee-wrap"><span class="marquee-text">${title}</span></span>`;
}
function applyMarquee(wrapEl) {
  const text = wrapEl.querySelector(".marquee-text"); if (!text) return;
  const wrapW = wrapEl.offsetWidth || 100;
  const textW = text.scrollWidth;
  if (textW > wrapW) {
    text.style.setProperty("--mo", -(textW - wrapW + 8) + "px");
    text.classList.add("scrolling");
  } else { text.classList.remove("scrolling"); }
}

// ── TOAST ──
let tTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg; el.classList.add("show");
  clearTimeout(tTimer);
  tTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

// ── INIT ──
const ytScript = document.createElement("script");
ytScript.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(ytScript);

setTimeout(() => document.getElementById("loading").classList.add("hidden"), 1400);
setTimeout(() => { if (!S.ytReady) showToast("Live Server로 실행해 주세요."); }, 5000);

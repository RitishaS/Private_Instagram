import React, { useEffect, useRef, useState } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

// --- Shared YouTube audio player -------------------------------------------------
// The backend only ever stores a YouTube videoId (from the YouTube Data API),
// never a direct audio file URL - YouTube's API does not expose one. So playback
// has to go through YouTube's own IFrame Player, which is the only officially
// supported way to play a YouTube video's audio. We keep a single hidden 1x1
// player shared across every MusicCard on the page so only one song plays at a
// time and we don't spin up a new player per card.
//
// NOTE: everything in this section (down to the MusicCard function) is the
// existing, working playback implementation and is intentionally left
// unchanged. Only the UI rendered by MusicCard below has been redesigned.

let youtubeApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previousCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        resolve(window.YT);
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    });
  }
  return youtubeApiPromise;
}

let sharedPlayer = null;
let sharedPlayerPromise = null;
function getSharedPlayer() {
  if (sharedPlayer) return Promise.resolve(sharedPlayer);
  if (!sharedPlayerPromise) {
    sharedPlayerPromise = loadYouTubeApi().then(
      (YT) =>
        new Promise((resolve) => {
          const container = document.createElement("div");
          container.id = "shared-youtube-audio-player";
          container.style.position = "fixed";
          container.style.bottom = "0";
          container.style.left = "0";
          container.style.width = "1px";
          container.style.height = "1px";
          container.style.opacity = "0";
          container.style.pointerEvents = "none";
          document.body.appendChild(container);

          sharedPlayer = new YT.Player(container.id, {
            height: "1",
            width: "1",
            playerVars: { playsinline: 1 },
            events: {
              onReady: () => resolve(sharedPlayer),
            },
          });
        })
    );
  }
  return sharedPlayerPromise;
}

// Lets every MusicCard know when a *different* card started playing, so it can
// reset its own "Playing" state back to "Play".
const listeners = new Set();
function notifyPlaying(videoId) {
  listeners.forEach((cb) => cb(videoId));
}

// --- UI helpers --------------------------------------------------------------

function formatTime(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function MusicCard({ title, artist, thumbnail, videoId, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  // "active" = this card's video is the one currently loaded in the shared
  // player (whether playing or paused). Used to enable the progress bar/seek
  // and to keep showing the right elapsed time after a pause.
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const pollRef = useRef(null);
  const trackRef = useRef(null);
  const autoPlayedVideoRef = useRef(null);

  // Fall back to YouTube's public thumbnail CDN if no thumbnail was supplied
  // (no thumbnail is currently stored in MongoDB with the post). This is just
  // an image URL, not a visible link/button to YouTube.
  const coverSrc = thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  useEffect(() => {
    const onOtherCardPlaying = (playingVideoId) => {
      if (playingVideoId !== videoId) {
        setIsPlaying(false);
        setIsActive(false);
        setCurrentTime(0);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };
    listeners.add(onOtherCardPlaying);
    return () => {
      listeners.delete(onOtherCardPlaying);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [videoId]);

  const startPolling = (player) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (typeof player.getPlayerState !== "function") return;

      if (typeof player.getCurrentTime === "function") {
        setCurrentTime(player.getCurrentTime() || 0);
      }
      if (typeof player.getDuration === "function") {
        const d = player.getDuration();
        if (d) setDuration(d);
      }

      const state = player.getPlayerState();
      // 0 = ended, 2 = paused
      if (state === 0 || state === 2) {
        setIsPlaying(false);
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 500);
  };

  const togglePlayback = async () => {
    if (!videoId) return;

    try {
      const player = await getSharedPlayer();
      const currentVideoId =
        typeof player.getVideoData === "function" ? player.getVideoData().video_id : null;

      if (isPlaying && currentVideoId === videoId) {
        player.pauseVideo();
        setIsPlaying(false);
        return;
      }

      if (currentVideoId !== videoId) {
        player.loadVideoById(videoId);
        setCurrentTime(0);
        setDuration(0);
      } else {
        player.playVideo();
      }

      setIsPlaying(true);
      setIsActive(true);
      notifyPlaying(videoId);
      startPolling(player);
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (!autoPlay || !videoId || autoPlayedVideoRef.current === videoId) return undefined;

    let cancelled = false;
    autoPlayedVideoRef.current = videoId;

    const startAutoPlayback = async () => {
      try {
        const player = await getSharedPlayer();
        if (cancelled) return;

        player.loadVideoById(videoId);
        player.playVideo();
        setCurrentTime(0);
        setDuration(0);
        setIsPlaying(true);
        setIsActive(true);
        notifyPlaying(videoId);
        startPolling(player);
      } catch (error) {
        // Browsers may block the first unmuted autoplay; the visible Play
        // button remains available as the user-initiated fallback.
        console.warn("Autoplay was blocked. Use the play button to start audio.", error);
        setIsPlaying(false);
      }
    };

    startAutoPlayback();
    return () => {
      cancelled = true;
    };
  }, [autoPlay, videoId]);

  const handleSeek = async (e) => {
    if (!videoId || !isActive || !duration || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const seekTime = ratio * duration;

    try {
      const player = await getSharedPlayer();
      if (typeof player.seekTo === "function") {
        player.seekTo(seekTime, true);
        setCurrentTime(seekTime);
      }
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  const progressPercent = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="post-music-container">
      <div className="music-player">
        <div className="music-player-top">
          <div className="music-player-cover">
            {coverSrc ? (
              <img src={coverSrc} alt={title || "Album art"} className="music-player-cover-img" />
            ) : (
              <div className="music-player-cover-placeholder">🎵</div>
            )}
          </div>

          <div className="music-player-info">
            <div className="music-player-title">{title || "Music"}</div>
            <div className="music-player-artist">{artist || "Unknown artist"}</div>
          </div>

          <button
            type="button"
            className={`music-player-toggle ${!videoId ? "disabled" : ""}`}
            onClick={togglePlayback}
            disabled={!videoId}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <FaPause /> : <FaPlay style={{ marginLeft: 2 }} />}
          </button>
        </div>

        {videoId ? (
          <div className="music-player-progress-row">
            <span className="music-player-time">{formatTime(currentTime)}</span>
            <div
              ref={trackRef}
              className={`music-player-track ${isActive ? "" : "inactive"}`}
              onClick={handleSeek}
            >
              <div className="music-player-track-fill" style={{ width: `${progressPercent}%` }} />
              <div className="music-player-track-thumb" style={{ left: `${progressPercent}%` }} />
            </div>
            <span className="music-player-time">{formatTime(duration)}</span>
          </div>
        ) : (
          <div className="song-preview-missing">Audio unavailable</div>
        )}
      </div>
    </div>
  );
}

export default MusicCard;

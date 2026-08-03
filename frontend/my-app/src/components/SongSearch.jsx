import React, { useState } from "react";
import axios from "axios";
import { YOUTUBE_API_KEY } from "../config";
import "./Styles.css";

function SongSearch({ onSongSelect }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSong, setSelectedSong] = useState(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    if (!YOUTUBE_API_KEY) {
      setError("YouTube API key is not configured.");
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);

    try {
      const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
        params: {
          key: YOUTUBE_API_KEY,
          q: `${searchQuery} music`,
          type: "video",
          part: "snippet",
          maxResults: 10,
          videoCategoryId: 10,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        setError("No songs found. Try a different search.");
        return;
      }

      const results = response.data.items.map((item) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url,
      }));

      setSearchResults(results);
    } catch (err) {
      console.error("YouTube API Error:", err);
      if (err.response?.status === 403) {
        setError("API key is invalid or quota exceeded. Contact admin.");
      } else if (err.response?.status === 400) {
        setError("Invalid search query. Try something else.");
      } else {
        setError("Error searching songs. Check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSong = (song) => {
    setSelectedSong(song);
    onSongSelect(song);
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className="song-search-container">
      <h3>🎵 Search for Music</h3>
      <div className="song-search-form" role="search">
        <input
          type="text"
          placeholder="Search songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          className="song-search-input"
        />
        <button type="button" className="song-search-button" onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      {selectedSong && (
        <div className="selected-song">
          <p>✓ Selected: <strong>{selectedSong.title}</strong></p>
          <button
            type="button"
            className="remove-song-button"
            onClick={() => {
              setSelectedSong(null);
              onSongSelect(null);
            }}
          >
            Remove
          </button>
        </div>
      )}

      <div className="search-results-container">
        {searchResults.map((song) => (
          <div
            key={song.id}
            className={`song-result ${selectedSong?.id === song.id ? "selected" : ""}`}
            onClick={() => handleSelectSong(song)}
          >
            <img src={song.thumbnail} alt={song.title} className="song-thumbnail" />
            <div className="song-info">
              <p className="song-title">{song.title}</p>
              <p className="song-channel">{song.channelTitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SongSearch;

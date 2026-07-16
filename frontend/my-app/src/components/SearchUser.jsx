import React, { useState } from "react";
import axios from "axios";
import MusicCard from "./MusicCard";
import "./Styles.css";

function SearchUser(){
  const [username, setUsername] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false); 

  const handleSearch = () => {
    if (!username.trim()) return;

    axios
      .get(`http://localhost:3000/files?username=${username}`)
      .then((response) => {
        setSearchResults(response.data);
        setError("");
        setSearched(true);
      })
      .catch((error) => {
        setError("Error fetching user posts.");
        setSearchResults([]);
        setSearched(true);
      });
  };

  const formatTime = (time) => {
    const date = new Date(time);
    return date.toLocaleString(); 
  };

  return (
    <div className="search-user-container">
      <input
        type="text"
        placeholder="Search by username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="search-input"
      />
      <button onClick={handleSearch} className="search-btn">
        Search
      </button>

      {error && <p className="error-message">{error}</p>}

      <div className="search-results">
        {searched ? (
          searchResults.length > 0 ? (
            searchResults.map((file) => (
              <div key={file._id} className="post-card">
                <div className="post-image-container">
                  <img
                    src={file.image_url}
                    alt={file.image_name}
                    className="post-image"
                  />
                </div>
                {file.songId && (
                  <MusicCard
                    title={file.songTitle}
                    artist={file.songChannel}
                    videoId={file.songId}
                  />
                )}
                <div className="post-footer">
                  <p className="post-username">@{file.username}</p>
                  <p className="post-caption">{file.caption}</p>
                  <p className="post-time">{formatTime(file.upload_time)}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No posts found for this username.</p>
          )
        ) : null}
      </div>
    </div>
  );
};

export default SearchUser;

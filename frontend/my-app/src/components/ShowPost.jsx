import React, { useState, useEffect } from "react";
import axios from "axios";
import MusicCard from "./MusicCard";
import PostActions from "./PostActions";
import "./Styles.css";


function ShowPost({ refreshTrigger, username, onOpenChat }){
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState({});

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(()=>{
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[refreshTrigger]);

  const fetchFiles = () => {
    // The Feed is a partner's-eye view: it excludes the logged-in user's
    // own posts (those belong on their Profile), and the exclusion is done
    // by the backend against the real Mongo data - not by hiding posts
    // client-side after fetching everything.
    const query = username
      ? `?exclude=${encodeURIComponent(username)}`
      : "";
    axios
      .get(`http://localhost:3000/files${query}`)
      .then((response) => {
        setFiles(response.data);
      })
      .catch((error) => {
        console.error("Error fetching files", error);
      });
  };

  const handleDelete = (id) => {
    axios
      .delete(`http://localhost:3000/delete/${id}`)
      .then(() => {
        fetchFiles();
      })
      .catch((error) => {
        console.error("Error deleting file", error);
      });
  };

  const handlePostUpdate = (updatedPost) => {
    setFiles((prev) =>
      prev.map((f) => (f._id === updatedPost._id ? updatedPost : f))
    );
  };

  const formatTime = (time) => {
    const date = new Date(time);
    return date.toLocaleString(); 
  };

  // Supports both older posts (single image_url) and newer
  // multi-image posts (images: [{image_url, image_name}, ...])
  const getPostImages = (file) => {
    if (file.images && file.images.length > 0) return file.images;
    if (file.image_url) return [{ image_url: file.image_url, image_name: file.image_name }];
    return [];
  };

  const goToImage = (postId, index, max) => {
    const clamped = Math.max(0, Math.min(index, max - 1));
    setActiveIndex((prev) => ({ ...prev, [postId]: clamped }));
  };

  return (
    <div className="insta-feed-container">
      <h2>Your Feed</h2>
      <div className="posts-feed">
        {files.map((file) => {
          const images = getPostImages(file);
          const current = activeIndex[file._id] || 0;

          return (
            <div key={file._id} className="insta-post">
              {/* Header: avatar + username + timestamp */}
              <div className="post-header">
                <div className="post-header-left">
                  <div className="user-avatar">
                    {(file.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="post-user-info">
                    <span className="post-username">@{file.username}</span>
                    <span className="post-location">{formatTime(file.upload_time)}</span>
                  </div>
                </div>
              </div>

              {/* Image carousel */}
              <div className="post-image-wrapper">
                {images.length > 0 && (
                  <img
                    src={images[current].image_url}
                    alt={images[current].image_name}
                    className="post-image-main"
                  />
                )}

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="post-image-nav post-image-nav-prev"
                      onClick={() => goToImage(file._id, current - 1, images.length)}
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="post-image-nav post-image-nav-next"
                      onClick={() => goToImage(file._id, current + 1, images.length)}
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                    <div className="post-image-dots">
                      {images.map((_, i) => (
                        <span
                          key={i}
                          className={`post-image-dot ${i === current ? "active" : ""}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Music (same MusicCard component/logic as before) */}
              {file.songId && (
                <MusicCard
                  title={file.songTitle}
                  artist={file.songChannel}
                  videoId={file.songId}
                />
              )}

              {/* Comments and direct-message controls */}
              <PostActions
                post={file}
                currentUser={username}
                onUpdate={handlePostUpdate}
                onOpenChat={onOpenChat}
              />

              {/* Caption + delete */}
              <div className="post-caption-section">
                <div>
                  <span className="caption-username">@{file.username}</span>
                  <span className="caption-text">{file.caption}</span>
                </div>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(file._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {files.length === 0 && (
          <div className="no-posts">No posts yet.</div>
        )}
      </div>
    </div>
  );
};

export default ShowPost;

import React, { useState, useEffect } from "react";
import axios from "axios";
import MusicCard from "./MusicCard";
import "./Styles.css";


function ShowPost(props){
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState({});

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(()=>{
    fetchFiles();
  },[props.refreshTrigger]);

  const fetchFiles = () => {
    axios
      .get("http://localhost:3000/files")
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
    <div className="show-posts-container">
      <h2>Your Feed</h2>
      <div className="posts-grid">
        {files.map((file) => {
          const images = getPostImages(file);
          const current = activeIndex[file._id] || 0;

          return (
            <div key={file._id} className="post-card">
              <div className="post-image-container">
                {images.length > 0 && (
                  <img
                    src={images[current].image_url}
                    alt={images[current].image_name}
                    className="post-image"
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
      </div>
    </div>
  );
};

export default ShowPost;

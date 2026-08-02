import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import MusicCard from "./MusicCard";
import PostActions from "./PostActions";
import Avatar from "./Avatar";
import "./Styles.css";
import "./FeedPremium.css";
import { FaHeart } from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";


function ShowPost({ refreshTrigger, username, profilePictures, onOpenChat }){
  const [files, setFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState({});
  const [autoplayPostId, setAutoplayPostId] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const postRefs = useRef(new Map());

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!event.target.closest(".post-options-wrapper")) {
        setOpenMenuPostId(null);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  useEffect(()=>{
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[refreshTrigger]);

  // Keep the soundtrack tied to the post currently being viewed. Only one
  // MusicCard can be active because the player itself is shared.
  useEffect(() => {
    if (!files.some((file) => file.songId)) {
      setAutoplayPostId(null);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visiblePosts = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visiblePosts[0]) {
          setAutoplayPostId(visiblePosts[0].target.dataset.postId);
        }
      },
      { threshold: [0.55, 0.75] }
    );

    postRefs.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [files]);

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
      .delete(`http://localhost:3000/delete/${id}`, { data: { username } })
      .then(() => {
        setOpenMenuPostId(null);
        fetchFiles();
      })
      .catch((error) => {
        console.error("Error deleting file", error);
      });
  };

  const handleToggleMenu = (postId) => {
    setOpenMenuPostId((currentOpenMenuPostId) => (
      currentOpenMenuPostId === postId ? null : postId
    ));
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
    <div className="insta-feed-container feed-premium">
      <div className="posts-feed">
        {files.map((file) => {
          const images = getPostImages(file);
          const current = activeIndex[file._id] || 0;

          return (
            <div
              key={file._id}
              className="insta-post"
              data-post-id={file._id}
              ref={(element) => {
                if (element && file.songId) postRefs.current.set(file._id, element);
                else postRefs.current.delete(file._id);
              }}
            >
              {/* Header: avatar + username + timestamp */}
              <div className="post-header feed-post-header">
                <div className="post-header-left">
                  <Avatar
                    username={file.username}
                    imageUrl={profilePictures?.[file.username?.toLowerCase()]}
                    className="post-avatar"
                  />
                  <div className="post-user-info">
                    <span className="post-username">@{file.username}</span>
                    <span className="post-location">{formatTime(file.upload_time)}</span>
                  </div>
                </div>
                {file.username?.toLowerCase() === username?.toLowerCase() && (
                  <div className="post-options-wrapper">
                    <button
                      type="button"
                      className="more-options post-options-trigger"
                      onClick={() => handleToggleMenu(file._id)}
                      aria-label="Post options"
                      aria-haspopup="menu"
                      aria-expanded={openMenuPostId === file._id}
                    >
                      <BsThreeDotsVertical />
                    </button>
                    {openMenuPostId === file._id && (
                      <div className="post-options-menu" role="menu" aria-label="Post actions">
                        <button
                          type="button"
                          className="post-options-item post-options-delete"
                          onClick={() => handleDelete(file._id)}
                          role="menuitem"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Image carousel */}
              <div className="post-image-wrapper feed-post-image-wrapper">
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
                  autoPlay={autoplayPostId === file._id}
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
              <div className="post-caption-section feed-post-caption">
                <div>
                  <span className="caption-username">@{file.username}</span>
                  <span className="caption-text">{file.caption}</span>
                </div>
              </div>
            </div>
          );
        })}

        {files.length === 0 && (
          <div className="no-posts feed-empty-state">
            <span aria-hidden="true">✦</span>
            <strong>No memories here yet</strong>
            <p>The next shared moment could be your favorite one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowPost;

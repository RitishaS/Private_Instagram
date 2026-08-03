import React, { useEffect, useState } from "react";
import axios from "axios";
import PostActions from "./PostActions";
import Avatar from "./Avatar";
import { FiCamera, FiEdit3, FiLogOut } from "react-icons/fi";
import { API_BASE_URL } from "../config";
import "./Styles.css";

function Profile({ username, password, profilePicture, profilePictures, onProfilePictureUpdated, onDelete, onOpenChat, onLogout }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [profilePictureMessage, setProfilePictureMessage] = useState("");
  const [updatingProfilePicture, setUpdatingProfilePicture] = useState(false);

  const fetchPosts = () => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/files?username=${encodeURIComponent(username)}`)
      .then((response) => {
        setPosts(response.data || []);
        setError("");
      })
      .catch(() => {
        setError("Unable to load your posts right now.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const handleDelete = (id) => {
    axios
      .delete(`${API_BASE_URL}/delete/${id}`, { data: { username } })
      .then(() => {
        setActivePost(null);
        fetchPosts();
        if (onDelete) onDelete();
      })
      .catch(() => {
        setError("Error deleting post.");
      });
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
    setActivePost((prev) =>
      prev && prev._id === updatedPost._id ? updatedPost : prev
    );
  };

  // Private, 2-person app: there is no follow graph, so the only possible
  // follower/following is the other account. Shown as a static stat rather
  // than fabricated backend data.
  const partnerCount = 1;

  // New posts store every upload in images; older posts only have image_url.
  const getPostImages = (post) => {
    if (Array.isArray(post.images) && post.images.length > 0) return post.images;
    return post.image_url
      ? [{ image_url: post.image_url, image_name: post.image_name }]
      : [];
  };

  const openPost = (post) => {
    setActiveImageIndex(0);
    setActivePost(post);
  };

  const handleProfilePictureSelection = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfilePictureMessage("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfilePictureMessage("Profile picture must be 5 MB or smaller.");
      return;
    }

    if (profilePreview) URL.revokeObjectURL(profilePreview);
    setSelectedProfilePicture(file);
    setProfilePreview(URL.createObjectURL(file));
    setProfilePictureMessage("");
  };

  const uploadProfilePicture = async () => {
    if (!selectedProfilePicture) return;
    const formData = new FormData();
    formData.append("profilePicture", selectedProfilePicture);
    formData.append("username", username);
    formData.append("password", password);

    try {
      setUpdatingProfilePicture(true);
      const response = await axios.post(`${API_BASE_URL}/profile-picture`, formData);
      onProfilePictureUpdated(response.data.profile);
      URL.revokeObjectURL(profilePreview);
      setSelectedProfilePicture(null);
      setProfilePreview("");
      setProfilePictureMessage("Profile picture updated.");
    } catch (uploadError) {
      setProfilePictureMessage(uploadError.response?.data?.error || "Unable to update profile picture.");
    } finally {
      setUpdatingProfilePicture(false);
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-header-card">
        <div className="profile-header-main">
          <div className="profile-avatar-frame">
            <Avatar username={username} imageUrl={profilePreview || profilePicture} className="profile-avatar" />
            <span className="profile-online-dot" title="Active now" aria-label="Active now" />
            <label htmlFor="profile-picture-input" className="profile-avatar-edit-badge" aria-label="Change profile picture">
              <FiCamera />
            </label>
          </div>

          <div className="profile-identity">
            <h2 className="profile-display-name">{username}</h2>
            <p className="profile-handle">@{username.toLowerCase()}</p>
            <p className="profile-bio">💗 Kuchu Puchu</p>
          </div>
        </div>

        <input
          id="profile-picture-input"
          type="file"
          accept="image/*"
          onChange={handleProfilePictureSelection}
          className="profile-picture-input"
        />

        {selectedProfilePicture && (
          <div className="profile-picture-confirm">
            <span>New photo selected</span>
            <button type="button" className="btn-save-picture" onClick={uploadProfilePicture} disabled={updatingProfilePicture}>
              {updatingProfilePicture ? "Uploading..." : "Save Picture"}
            </button>
          </div>
        )}
        {profilePictureMessage && <p className="profile-picture-message">{profilePictureMessage}</p>}

        <div className="profile-header-actions">
          <label htmlFor="profile-picture-input" className="btn-edit-profile">
            <FiEdit3 />
            <span>Edit Profile</span>
          </label>
          {onLogout && (
            <button type="button" className="btn-logout" onClick={onLogout}>
              <FiLogOut />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      <div className="profile-stats-row">
        <div className="profile-stat">
          <span className="profile-stat-number">{posts.length}</span>
          <span className="profile-stat-label">Posts</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-number">{partnerCount}</span>
          <span className="profile-stat-label">Followers</span>
        </div>
        <div className="profile-stat-divider" />
        <div className="profile-stat">
          <span className="profile-stat-number">{partnerCount}</span>
          <span className="profile-stat-label">Following</span>
        </div>
      </div>

      {error && <div className="no-posts">{error}</div>}

      {loading ? (
        <div className="no-posts">Loading your posts...</div>
      ) : posts.length === 0 ? (
        <div className="no-posts">No posts yet. Share your first memory! 🎞️</div>
      ) : (
        <div className="profile-grid">
          {posts.map((post) => {
            const images = getPostImages(post);
            return (
              <button
                key={post._id}
                className="profile-grid-item"
                onClick={() => openPost(post)}
                type="button"
              >
              {images.length > 0 && (
                <img src={images[0].image_url} alt={post.caption || "post"} />
              )}
              {(post.songVideoId || post.songId) && (
                <span className="profile-grid-music-badge">🎵</span>
              )}
            </button>
            );
          })}
        </div>
      )}

      {activePost && (
        <div className="profile-lightbox" onClick={() => setActivePost(null)}>
          <div className="profile-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn profile-lightbox-close" onClick={() => setActivePost(null)}>
              ✕
            </button>
            {(() => {
              const images = getPostImages(activePost);
              const image = images[activeImageIndex] || images[0];
              return image && (
                <>
                  <img src={image.image_url} alt={activePost.caption || "post"} />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="post-image-nav post-image-nav-prev"
                        onClick={() => setActiveImageIndex((index) => Math.max(0, index - 1))}
                        aria-label="Previous photo"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="post-image-nav post-image-nav-next"
                        onClick={() => setActiveImageIndex((index) => Math.min(images.length - 1, index + 1))}
                        aria-label="Next photo"
                      >
                        ›
                      </button>
                      <div className="post-image-dots">
                        {images.map((_, index) => (
                          <span
                            key={index}
                            className={`post-image-dot ${index === activeImageIndex ? "active" : ""}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            <div className="profile-lightbox-caption">{activePost.caption}</div>
            <PostActions
              post={activePost}
              currentUser={username}
              profilePictures={profilePictures}
              onUpdate={handlePostUpdate}
              onOpenChat={onOpenChat}
            />
            {activePost.username?.toLowerCase() === username?.toLowerCase() && (
              <button className="delete-button" onClick={() => handleDelete(activePost._id)}>
                Delete Post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

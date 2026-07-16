import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Styles.css";

function Profile({ username, onDelete }) {
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);

  const fetchPosts = () => {
    setLoading(true);
    axios
      .get(`http://localhost:3000/files?username=${username}`)
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
      .delete(`http://localhost:3000/delete/${id}`)
      .then(() => {
        setActivePost(null);
        fetchPosts();
        if (onDelete) onDelete();
      })
      .catch(() => {
        setError("Error deleting post.");
      });
  };

  const musicCount = posts.filter((p) => p.songVideoId || p.songId).length;

  return (
    <div className="profile-screen">
      <div className="profile-header-card">
        <div className="profile-avatar">{(username || "U").charAt(0).toUpperCase()}</div>
        <div className="profile-name-block">
          <div className="profile-username">{username}</div>
          <div className="profile-tagline">💗 Private Couple Space</div>
        </div>
      </div>

      <div className="profile-stats-row">
        <div className="profile-stat">
          <span className="profile-stat-number">{posts.length}</span>
          <span className="profile-stat-label">Posts</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-number">{musicCount}</span>
          <span className="profile-stat-label">With Music</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-number">∞</span>
          <span className="profile-stat-label">Memories</span>
        </div>
      </div>

      {error && <div className="no-posts">{error}</div>}

      {loading ? (
        <div className="no-posts">Loading your posts...</div>
      ) : posts.length === 0 ? (
        <div className="no-posts">No posts yet. Share your first memory! 🎞️</div>
      ) : (
        <div className="profile-grid">
          {posts.map((post) => (
            <button
              key={post._id}
              className="profile-grid-item"
              onClick={() => setActivePost(post)}
              type="button"
            >
              <img src={post.image_url} alt={post.caption || "post"} />
              {(post.songVideoId || post.songId) && (
                <span className="profile-grid-music-badge">🎵</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activePost && (
        <div className="profile-lightbox" onClick={() => setActivePost(null)}>
          <div className="profile-lightbox-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn profile-lightbox-close" onClick={() => setActivePost(null)}>
              ✕
            </button>
            <img src={activePost.image_url} alt={activePost.caption || "post"} />
            <div className="profile-lightbox-caption">{activePost.caption}</div>
            <button className="delete-button" onClick={() => handleDelete(activePost._id)}>
              Delete Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;

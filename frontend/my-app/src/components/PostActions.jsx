import React, { useState } from "react";
import axios from "axios";
import Avatar from "./Avatar";
import { API_BASE_URL } from "../config";
import "./Styles.css";

// Renders like + comment controls for a single post, and persists every
// action straight to MongoDB via the backend. Used by both the Feed and
// the Profile screen so likes/comments can never drift out of sync between
// them - there is exactly one source of truth (the post document in Mongo)
// and exactly one place that knows how to read/write it.
function PostActions({ post, currentUser, profilePictures, onUpdate }) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const likes = post.likes || [];
  const comments = post.comments || [];
  const hasLiked = likes.some(
    (u) => u.toLowerCase() === (currentUser || "").toLowerCase()
  );

  const handleLike = () => {
    if (!currentUser) return;
    axios
      .post(`${API_BASE_URL}/like/${post._id}`, { username: currentUser })
      .then((response) => {
        onUpdate({ ...post, likes: response.data.likes });
      })
      .catch((err) => {
        console.error("Error liking post", err);
        setError("Could not update like.");
      });
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (!currentUser || !commentText.trim()) return;

    setSubmitting(true);
    axios
      .post(`${API_BASE_URL}/comment/${post._id}`, {
        username: currentUser,
        text: commentText.trim(),
      })
      .then((response) => {
        onUpdate({ ...post, comments: response.data.comments });
        setCommentText("");
        setError("");
      })
      .catch((err) => {
        console.error("Error adding comment", err);
        setError("Could not post comment.");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="post-actions-block">
      <div className="post-actions">
        <button
          type="button"
          className={`action-btn like-btn ${hasLiked ? "liked" : ""}`}
          onClick={handleLike}
          aria-label={hasLiked ? "Unlike" : "Like"}
        >
          <span className="like-icon-pop">{hasLiked ? "❤️" : "🤍"}</span>
        </button>
        <span className="likes-count">
          <span className="stat-number">{likes.length}</span>
          <span className="stat-label">{likes.length === 1 ? "like" : "likes"}</span>
        </span>
        <span className="comments-count">
          <span className="stat-number">{comments.length}</span>
          <span className="stat-label">{comments.length === 1 ? "comment" : "comments"}</span>
        </span>
      </div>

      {comments.length > 0 && (
        <div className="post-comments-list">
          {comments.map((c, i) => (
            <p className="post-comment" key={`${c.username}-${i}`}>
              <Avatar
                username={c.username}
                imageUrl={profilePictures?.[c.username?.toLowerCase()]}
                className="comment-avatar"
              />
              <span><strong>@{c.username}</strong> {c.text}</span>
            </p>
          ))}
        </div>
      )}

      <form className="post-comment-form" onSubmit={handleComment}>
        <input
          type="text"
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="post-comment-input"
        />
        <button type="submit" className="post-comment-submit" disabled={submitting}>
          Post
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default PostActions;

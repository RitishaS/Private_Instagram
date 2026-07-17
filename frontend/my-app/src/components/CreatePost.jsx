import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import SongSearch from "./SongSearch";
import "./Styles.css";

function CreatePost(props){
  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [caption, setCaption] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Revoke object URLs when previews change/unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const handleImageChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (newFiles.length === 0) return;

    setImageFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [
      ...prev,
      ...newFiles.map((file) => ({ url: URL.createObjectURL(file), name: file.name })),
    ]);

    // Allow re-selecting the same file again later
    e.target.value = "";
  };

  const handleRemoveImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSongSelect = (song) => {
    setSelectedSong(song);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (imageFiles.length === 0 || !caption.trim()) {
      setMessage("Please write a caption and select at least one photo.");
      return;
    }

    const formData = new FormData();
    imageFiles.forEach((file) => formData.append("images", file));
    formData.append("username", props.username);
    formData.append("password", props.password);
    formData.append("caption", caption);
    
    // Add song info if selected
    if (selectedSong) {
      formData.append("songId", selectedSong.id);
      formData.append("songTitle", selectedSong.title);
      formData.append("songChannel", selectedSong.channelTitle);
    }

    try {
      setUploading(true);
      const response = await axios.post("http://localhost:3000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.error) {
        setMessage(response.data.error);
      } else {
        setMessage("Post created successfully!");
        props.setRefreshTrigger((prev) => prev + 1);
        setCaption("");
        previews.forEach((p) => URL.revokeObjectURL(p.url));
        setImageFiles([]);
        setPreviews([]);
        setSelectedSong(null);
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Error uploading post.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="create-post-container">
      <h2>Create a New Post</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="caption-input"
        />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          className="file-input"
          id="post-image-input"
          ref={fileInputRef}
        />
        <label htmlFor="post-image-input" className="file-upload-btn">
          📷 Select Photos
        </label>

        {previews.length > 0 && (
          <div className="image-preview-grid">
            {previews.map((preview, index) => (
              <div className="image-preview-item" key={preview.url}>
                <img src={preview.url} alt={preview.name} className="image-preview-thumb" />
                <button
                  type="button"
                  className="image-preview-remove"
                  onClick={() => handleRemoveImage(index)}
                  aria-label={`Remove ${preview.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {previews.length > 0 && (
          <p className="file-selected">
            ✓ {previews.length} photo{previews.length > 1 ? "s" : ""} selected
          </p>
        )}

        <SongSearch onSongSelect={handleSongSelect} />

        <button type="submit" className="upload-button" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Post"}
        </button>
      </form>
      {message && <p className={`message ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
    </div>
  );
};

export default CreatePost;

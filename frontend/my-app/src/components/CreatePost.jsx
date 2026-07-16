import React, { useState } from "react";
import axios from "axios";
import SongSearch from "./SongSearch";
import "./Styles.css";

function CreatePost(props){
  const [imageFile, setImageFile] = useState(null);
  const [selectedSong, setSelectedSong] = useState(null);
  const [caption, setCaption] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleSongSelect = (song) => {
    setSelectedSong(song);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile || !caption.trim() || !password.trim()) {
      setMessage("Please fill in password, caption and select an image.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("username", props.username);
    formData.append("password", password);
    formData.append("caption", caption);
    
    // Add song info if selected
    if (selectedSong) {
      formData.append("songId", selectedSong.id);
      formData.append("songTitle", selectedSong.title);
      formData.append("songChannel", selectedSong.channelTitle);
    }

    try {
      const response = await axios.post("http://localhost:3000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.error) {
        setMessage(response.data.error);
      } else {
        setMessage("Post created successfully!");
        props.setRefreshTrigger((prev) => prev + 1);
        setCaption("");
        setPassword("");
        setImageFile(null);
        setSelectedSong(null);
      }
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.error || "Error uploading post.");
    }
  };

  return (
    <div className="create-post-container">
      <h2>Create a New Post</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="text-input"
        />

        <textarea
          placeholder="Write a caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="caption-input"
        />

        <label className="file-label">📷 Select Image (Required)</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="file-input"
          required
        />
        {imageFile && <p className="file-selected">✓ Image selected: {imageFile.name}</p>}

        <SongSearch onSongSelect={handleSongSelect} />

        <button type="submit" className="upload-button">
          Upload Post
        </button>
      </form>
      {message && <p className={`message ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
    </div>
  );
};

export default CreatePost;

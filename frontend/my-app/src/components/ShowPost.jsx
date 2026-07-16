import React, { useState, useEffect } from "react";
import axios from "axios";
import MusicCard from "./MusicCard";
import "./Styles.css";


function ShowPost(props){
  const [files, setFiles] = useState([]);

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

  return (
    <div className="show-posts-container">
      <h2>Your Feed</h2>
      <div className="posts-grid">
        {files.map((file) => (
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
              <button
                className="delete-button"
                onClick={() => handleDelete(file._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShowPost;

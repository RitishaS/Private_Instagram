import React, { useRef, useState } from "react";
import axios from "axios";
import "./Click.css"

const Click = ({ onClose, onUpload }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [username, setUsername] = useState("");
  const [caption, setCaption] = useState("");
  const [photoTaken, setPhotoTaken] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
    } catch (error) {
      console.error("Camera error:", error);
      alert("Unable to access camera");
    }
  };

  const takePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    setPhotoTaken(true);

    video.srcObject.getTracks().forEach(track => track.stop());
  };

  const handleSubmit = async () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL("image/png");
  
    const blob = await (await fetch(imageData)).blob();
    const formData = new FormData();
    formData.append("file", blob, "photo.png"); 
    formData.append("username", username);
    formData.append("caption", caption);
  
    try {
      await axios.post("http://localhost:3000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
  
      alert("Post created!");
      setUsername("");
      setCaption("");
      setPhotoTaken(false);
      onUpload(); 
      onClose(); 
    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading post.");
    }
  };
  

  return (
    <div className="create-post-container">
      <h2>Camera Post</h2>

      <video
        ref={videoRef}
        autoPlay
        style={{ width: "100%", display: photoTaken ? "none" : "block" }}
      />
      <canvas
        ref={canvasRef}
        style={{ display: photoTaken ? "block" : "none", width: "100%" }}
      />

      {!photoTaken && (
        <>
          <button className="upload-button" onClick={startCamera}>Start Camera</button>
          <button className="upload-button" onClick={takePhoto}>Take Photo</button>
        </>
      )}

      {photoTaken && (
        <>
          <input
            className="text-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          /><br/>
          <textarea
            className="caption-input"
            placeholder="Caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          /><br/>
          <button className="upload-button" onClick={handleSubmit}>Upload Post</button>
        </>
      )}
    </div>
  );
};

export default Click;

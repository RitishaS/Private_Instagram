import React, { useState } from "react";
import CreatePost from "./components/CreatePost";
import ShowPost from "./components/ShowPost";
import SearchUser from "./components/SearchUser";
import Profile from "./components/Profile";
import Click from "./components/Click";
import Login from "./components/Login";
import "./components/Styles.css";
import { TiSocialInstagramCircular } from "react-icons/ti";
import { BsCameraFill } from "react-icons/bs";
import { AiOutlineHome, AiOutlineSearch, AiOutlineHeart, AiOutlineUser } from "react-icons/ai";
import { RiAddCircleLine } from "react-icons/ri";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showSearchUser, setShowSearchUser] = useState(false);
  const [showClick, setShowClick] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("home");

  const handleLoginSuccess = (username, password) => {
    setCurrentUser(username);
    setCurrentPassword(password);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPassword(null);
  };

  const toggleCreatePost = () => setShowCreate((prev) => !prev);
  const refreshPosts = () => setRefreshTrigger((prev) => prev + 1);
  const toggleSearchUser = () => setShowSearchUser((prev) => !prev);
  const toggleClick = () => setShowClick((prev) => !prev);

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          <span className="Ti"><TiSocialInstagramCircular /></span>
          <span className="logo">Private Couple Instagram</span>
        </h1>
        <div className="user-info">
          <span className="username">👤 {currentUser}</span>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main>
        {showCreate ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CreatePost username={currentUser} password={currentPassword} setRefreshTrigger={setRefreshTrigger} onClose={() => setShowCreate(false)} />
          </div>
        ) : (
          <>
            {activeTab === "home" && <ShowPost refreshTrigger={refreshTrigger} />}
            {activeTab === "search" && <SearchUser />}
            {activeTab === "likes" && (
              <div className="placeholder-screen">
                <div className="placeholder-icon">❤️</div>
                <h2>Your Liked Posts</h2>
                <p>Coming soon...</p>
              </div>
            )}
            {activeTab === "profile" && (
              <Profile username={currentUser} onDelete={refreshPosts} />
            )}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === "home" ? "active" : ""}`}
          onClick={() => { setShowCreate(false); setActiveTab("home"); }}
        >
          <AiOutlineHome size={24} />
        </button>
        <button 
          className={`nav-item ${activeTab === "search" ? "active" : ""}`}
          onClick={() => { setShowCreate(false); setActiveTab("search"); }}
        >
          <AiOutlineSearch size={24} />
        </button>
        <button 
          className="nav-item center-item"
          onClick={toggleCreatePost}
        >
          <RiAddCircleLine size={28} />
        </button>
        <button 
          className={`nav-item ${activeTab === "likes" ? "active" : ""}`}
          onClick={() => { setShowCreate(false); setActiveTab("likes"); }}
        >
          <AiOutlineHeart size={24} />
        </button>
        <button 
          className={`nav-item ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => { setShowCreate(false); setActiveTab("profile"); }}
        >
          <AiOutlineUser size={24} />
        </button>
      </nav>
    </div>
  );
};

export default App;

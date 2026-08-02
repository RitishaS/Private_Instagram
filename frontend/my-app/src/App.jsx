import React, { useEffect, useState } from "react";
import axios from "axios";
import CreatePost from "./components/CreatePost";
import ShowPost from "./components/ShowPost";
import SearchUser from "./components/SearchUser";
import Profile from "./components/Profile";
import ChatScreen from "./components/ChatScreen";
import Login from "./components/Login";
import Avatar from "./components/Avatar";
import "./components/Styles.css";
import "./components/HeaderPremium.css";
import { TiSocialInstagramCircular } from "react-icons/ti";
import { AiOutlineHome, AiOutlineSearch, AiOutlineMessage, AiOutlineUser } from "react-icons/ai";
import { RiAddCircleLine } from "react-icons/ri";
import { LiaInstagram } from "react-icons/lia";

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [profiles, setProfiles] = useState({});

  useEffect(() => {
    if (!currentUser) {
      setProfiles({});
      return;
    }

    axios.get("http://localhost:3000/profiles")
      .then((response) => {
        setProfiles(
          (response.data || []).reduce((allProfiles, profile) => ({
            ...allProfiles,
            [profile.username.toLowerCase()]: profile.profilePictureUrl
          }), {})
        );
      })
      .catch((error) => console.error("Unable to load profiles", error));
  }, [currentUser]);

  const updateProfilePicture = (profile) => {
    setProfiles((previous) => ({
      ...previous,
      [profile.username.toLowerCase()]: profile.profilePictureUrl
    }));
  };

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

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <header className="app-header header-premium">
        <div className="header-bg-glow" aria-hidden="true" />
        <span className="header-sparkle" aria-hidden="true" />
        <span className="header-sparkle" aria-hidden="true" />
        <span className="header-sparkle" aria-hidden="true" />
        <span className="header-sparkle" aria-hidden="true" />

        <div className="header-brand">
          <div className="header-logo-row">
            <span className="header-icon"><LiaInstagram /></span>
            <span className="header-logo">Our Instagram</span>
            <span className="header-heart" aria-hidden="true">💗</span>
          </div>
          <p className="header-tagline">Every Memory Matters</p>
        </div>

        <div className="header-right">
          <div className="header-avatar-ring">
            <Avatar
              username={currentUser}
              imageUrl={profiles[currentUser.toLowerCase()]}
              className="header-avatar"
            />
          </div>
        </div>
      </header>

      <main>
        {showCreate ? (
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <CreatePost username={currentUser} password={currentPassword} setRefreshTrigger={setRefreshTrigger} onClose={() => setShowCreate(false)} />
          </div>
        ) : (
          <>
            {activeTab === "home" && <ShowPost refreshTrigger={refreshTrigger} username={currentUser} profilePictures={profiles} onOpenChat={() => setActiveTab("chat")} />}
            {activeTab === "search" && <SearchUser profilePictures={profiles} />}
            {activeTab === "chat" && <ChatScreen currentUser={currentUser} profilePictures={profiles} onBack={() => setActiveTab("home")} />}
            {activeTab === "profile" && (
              <Profile
                username={currentUser}
                password={currentPassword}
                profilePicture={profiles[currentUser.toLowerCase()]}
                profilePictures={profiles}
                onProfilePictureUpdated={updateProfilePicture}
                onDelete={refreshPosts}
                onOpenChat={() => setActiveTab("chat")}
                onLogout={handleLogout}
              />
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
          className={`nav-item ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => { setShowCreate(false); setActiveTab("chat"); }}
        >
          <AiOutlineMessage size={24} />
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

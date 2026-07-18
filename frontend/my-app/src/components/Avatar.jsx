import { useState } from "react";

function Avatar({ username, imageUrl, className = "" }) {
  const [hasImageError, setHasImageError] = useState(false);
  const initial = (username || "U").charAt(0).toUpperCase();

  return (
    <div className={`${className} shared-avatar`} aria-label={`${username || "User"} profile picture`}>
      {imageUrl && !hasImageError ? (
        <img src={imageUrl} alt="" onError={() => setHasImageError(true)} />
      ) : (
        initial
      )}
    </div>
  );
}

export default Avatar;

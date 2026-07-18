let express = require("express");
let multer = require("multer");
let { MongoClient, ObjectId } = require("mongodb");
let path = require("path");
let fs = require("fs");
let cors = require("cors");
let cloudinary = require("cloudinary").v2;
let{CloudinaryStorage}=require("multer-storage-cloudinary");
let { createServer } = require("http");
let { Server } = require("socket.io");

cloudinary.config({
cloud_name: "dx1lweizb",
api_key: "241197616858346",
api_secret: "V0EAGjl4SLxNJenUf2dL0k7QX_c"
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] }
});
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(cors());

// Hardcoded Users
const users = [
  { username: "Manan", password: "Ritisha" },
  { username: "Ritisha", password: "Ritisha" }
];
const CHAT_ROOM = "private-couple-chat";
const onlineUsers = new Map();

const url = "mongodb://0.0.0.0:27017";

// let storage=multer.diskStorage(
//     {
//         destination:(req,file,cb)=>cb(null,"uploads/"),
//         filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
//     }
// );

let storage = new CloudinaryStorage({cloudinary});

let upload = multer({storage});

// Middleware to handle image upload (supports one or more images)
let uploadImages = upload.array('images', 10);
const MAX_PROFILE_PICTURE_SIZE = 5 * 1024 * 1024;
const PROFILE_PICTURE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const profilePictureUpload = multer({
  storage,
  limits: { fileSize: MAX_PROFILE_PICTURE_SIZE },
  fileFilter: (req, file, cb) => {
    if (PROFILE_PICTURE_MIME_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new Error("Profile picture must be a JPG, PNG, WebP, or GIF image"));
  }
}).single("profilePicture");

// Authentication check function
const authenticateUser = (username, password) => {
  return users.some(user => user.username === username && user.password === password);
};

const getKnownUsername = (username) => {
  const user = users.find(
    (item) => item.username.toLowerCase() === (username || "").trim().toLowerCase()
  );
  return user ? user.username : null;
};

const getDefaultProfilePicture = (username) => {
  const initial = username.charAt(0).toUpperCase();
  const color = username === "Ritisha" ? "#ff6b9d" : "#7c3aed";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="${color}"/><text x="60" y="76" text-anchor="middle" font-family="Arial, sans-serif" font-size="58" font-weight="700" fill="white">${initial}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const getOtherUser = (username) =>
  users.find((user) => user.username !== username)?.username || null;

const getOnlineUsernames = () => [...onlineUsers.keys()];

const broadcastPresence = () => {
  io.to(CHAT_ROOM).emit("chat:presence", { onlineUsers: getOnlineUsernames() });
};

// Escapes special regex characters so a username can be safely used inside a $regex query
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

app.post("/upload", uploadImages, (req, res) => {
    const { username, password, caption, songId, songTitle, songChannel } = req.body;
    
    // Check if user is authorized
    if (!authenticateUser(username, password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check if at least one image is provided
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    let client = new MongoClient(url);
    let db = client.db("insta");
    let collection = db.collection("photos");

    const images = req.files.map((file) => ({
      image_url: file.path,
      image_name: file.filename
    }));
    
    let obj = {
        username: username,
        caption: caption,
        // Keep legacy single-image fields (first image) so any older
        // frontend code or existing posts keep working unchanged
        image_url: images[0].image_url,
        image_name: images[0].image_name,
        // New field: full list of images for this post
        images: images,
        comments: [],
        upload_time: new Date()
    };

    // Add YouTube music info if provided
    if (songId) {
      obj.songId = songId;
      obj.songTitle = songTitle;
      obj.songChannel = songChannel;
    }

    collection.insertOne(obj)
      .then((result) => {
        res.json({ success: true, message: "Post created successfully", data: result });
      })
      .catch((err) => {
        res.status(500).json({ error: "Error creating post", details: err });
      });
});

// Login endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  if (authenticateUser(username, password)) {
    res.json({ success: true, username });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// Profiles are kept independently from posts so one picture is reused across
// the feed, comments, search, chat, header, and profile page.
app.get("/profiles", async (req, res) => {
  try {
    const client = new MongoClient(url);
    const collection = client.db("insta").collection("userProfiles");

    await collection.bulkWrite(
      users.map(({ username }) => ({
        updateOne: {
          filter: { username },
          update: {
            $setOnInsert: {
              username,
              profilePictureUrl: getDefaultProfilePicture(username),
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      }))
    );

    const profiles = await collection.find({ username: { $in: users.map((user) => user.username) } }).toArray();
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: "Unable to load profiles" });
  }
});

app.post("/profile-picture", (req, res) => {
  profilePictureUpload(req, res, async (uploadError) => {
    if (uploadError) {
      const error = uploadError.code === "LIMIT_FILE_SIZE"
        ? "Profile picture must be 5 MB or smaller"
        : uploadError.message || "Unable to upload profile picture";
      return res.status(400).json({ error });
    }

    const username = getKnownUsername(req.body.username);
    if (!authenticateUser(username, req.body.password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ error: "A profile picture is required" });
    }

    try {
      const profile = {
        username,
        profilePictureUrl: req.file.path,
        updatedAt: new Date()
      };
      const client = new MongoClient(url);
      await client.db("insta").collection("userProfiles").updateOne(
        { username },
        { $set: profile },
        { upsert: true }
      );
      res.json({ success: true, profile });
    } catch (err) {
      res.status(500).json({ error: "Unable to save profile picture" });
    }
  });
});

app.get("/files", (req, res) => {
  let client = new MongoClient(url);
  const { username, exclude } = req.query;

  // Build the query out of real, explicit conditions instead of a single
  // implicit equality object, so "give me my own posts" (username=) and
  // "give me everyone else's posts" (exclude=) can never be conflated.
  const conditions = [];

  if (username && username.trim()) {
    conditions.push({
      username: { $regex: `^${escapeRegex(username.trim())}$`, $options: "i" }
    });
  }

  if (exclude && exclude.trim()) {
    conditions.push({
      username: { $not: { $regex: `^${escapeRegex(exclude.trim())}$`, $options: "i" } }
    });
  }

  const query = conditions.length > 0 ? { $and: conditions } : {};

      let db = client.db("insta");
      let collec= db.collection("photos");
      collec.find(query).sort({ upload_time: -1 }).toArray()
    .then((result) => {
      const uploadOrigin = `${req.protocol}://${req.get("host")}`;
      const toRenderableUrl = (imageUrl) =>
        imageUrl && imageUrl.startsWith("/")
          ? `${uploadOrigin}${imageUrl}`
          : imageUrl;

      // Older uploads stored local paths such as /uploads/photo.jpg. Those
      // paths must be served from Express, not resolved against the frontend.
      const posts = result.map((post) => ({
        ...post,
        image_url: toRenderableUrl(post.image_url),
        images: Array.isArray(post.images)
          ? post.images.map((image) => ({
              ...image,
              image_url: toRenderableUrl(image.image_url)
            }))
          : post.images
      }));

      res.json(posts);
    })
    .catch((err) => {
      res.status(500).json({ error: "Error fetching posts", details: err });
    })
});

// Toggle the logged-in user's like and return the post's current likes so the
// client can update its existing card without reloading the full feed.
app.post("/like/:id", async (req, res) => {
  const username = getKnownUsername(req.body.username);
  if (!username) {
    return res.status(400).json({ error: "A valid username is required" });
  }

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  try {
    const client = new MongoClient(url);
    const collec = client.db("insta").collection("photos");
    const post = await collec.findOne({ _id });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const likes = Array.isArray(post.likes) ? post.likes : [];
    const usernamePattern = new RegExp(`^${escapeRegex(username)}$`, "i");
    const hasLiked = likes.some(
      (likedBy) => typeof likedBy === "string" && usernamePattern.test(likedBy)
    );

    if (hasLiked) {
      await collec.updateOne({ _id }, { $pull: { likes: usernamePattern } });
    } else {
      await collec.updateOne({ _id }, { $addToSet: { likes: username } });
    }

    const updatedPost = await collec.findOne({ _id });
    res.json({ success: true, likes: updatedPost.likes || [] });
  } catch (err) {
    res.status(500).json({ error: "Error updating like" });
  }
});

// Add a comment to a post (persisted in MongoDB, shared by Feed and Profile)
app.post("/comment/:id", (req, res) => {
  const { username, text } = req.body;
  if (!username || !username.trim() || !text || !text.trim()) {
    return res.status(400).json({ error: "username and comment text are required" });
  }

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  let client = new MongoClient(url);
  let db = client.db("insta");
  let collec = db.collection("photos");

  const comment = {
    username: username.trim(),
    text: text.trim(),
    time: new Date()
  };

  collec.updateOne({ _id }, { $push: { comments: comment } })
    .then((result) => {
      if (result.matchedCount === 0) {
        res.status(404).json({ error: "Post not found" });
        return null;
      }
      return collec.findOne({ _id });
    })
    .then((updatedPost) => {
      if (updatedPost) {
        res.json({ success: true, comments: updatedPost.comments || [] });
      }
    })
    .catch((err) => {
      res.status(500).json({ error: "Error adding comment", details: err });
    });
});

app.delete("/delete/:id",(req,res)=>{
  const username = getKnownUsername(req.body && req.body.username);
  if (!username) {
    return res.status(400).json({ error: "A valid username is required" });
  }

  let _id;
  try {
    _id = new ObjectId(req.params.id);
  } catch (err) {
    return res.status(400).json({ error: "Invalid post id" });
  }

  let client = new MongoClient(url);
  let db = client.db("insta");
  let collec = db.collection("photos");
  
  collec.findOne({_id})
  .then((post)=>{
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if ((post.username || "").toLowerCase() !== username.toLowerCase()) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }
    
    // Delete every image in the post from Cloudinary
    const imagesToDelete = post.images && post.images.length > 0
      ? post.images
      : (post.image_name ? [{ image_name: post.image_name }] : []);

    imagesToDelete.forEach(({ image_name }) => {
      if (image_name) {
        cloudinary.uploader.destroy(image_name, (error, result) => {
          if (error) console.log("Error deleting image:", error);
        });
      }
    });
    
    return collec.deleteOne({_id});
  })
  .then((result)=> {
    if (result && result.deletedCount === 1) {
      res.json({ success: true, message: "Post deleted successfully" });
    }
  })
  .catch((err)=> {
    res.status(500).json({ error: "Error deleting post", details: err });
  });
});

// Returns the full history for the only private conversation in the app.
app.get("/messages", async (req, res) => {
  const username = getKnownUsername(req.query.username);
  if (!username) return res.status(400).json({ error: "A valid username is required" });

  try {
    const client = new MongoClient(url);
    const messages = await client
      .db("insta")
      .collection("messages")
      .find({ participants: { $all: users.map((user) => user.username) } })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Unable to load messages" });
  }
});

io.on("connection", (socket) => {
  socket.on("chat:join", ({ username }) => {
    const cleanUsername = getKnownUsername(username);
    if (!cleanUsername) return socket.emit("chat:error", { message: "Unauthorized chat user" });

    socket.data.username = cleanUsername;
    socket.join(CHAT_ROOM);
    onlineUsers.set(cleanUsername, (onlineUsers.get(cleanUsername) || 0) + 1);
    broadcastPresence();
  });

  socket.on("chat:send", async ({ text }) => {
    const sender = socket.data.username;
    const messageText = typeof text === "string" ? text.trim() : "";
    if (!sender || !messageText) return;

    const recipient = getOtherUser(sender);
    const message = {
      participants: ["Manan", "Ritisha"],
      sender,
      recipient,
      text: messageText,
      createdAt: new Date()
    };

    try {
      const client = new MongoClient(url);
      const result = await client.db("insta").collection("messages").insertOne(message);
      io.to(CHAT_ROOM).emit("chat:message", { ...message, _id: result.insertedId });
    } catch (err) {
      socket.emit("chat:error", { message: "Message could not be sent" });
    }
  });

  socket.on("chat:typing", ({ isTyping }) => {
    if (!socket.data.username) return;
    socket.to(CHAT_ROOM).emit("chat:typing", {
      username: socket.data.username,
      isTyping: Boolean(isTyping)
    });
  });

  socket.on("chat:seen", async () => {
    const recipient = socket.data.username;
    if (!recipient) return;

    try {
      const seenAt = new Date();
      const client = new MongoClient(url);
      await client.db("insta").collection("messages").updateMany(
        { recipient, seenAt: { $exists: false } },
        { $set: { seenAt } }
      );
      io.to(CHAT_ROOM).emit("chat:seen", { recipient, seenAt });
    } catch (err) {
      socket.emit("chat:error", { message: "Could not update seen status" });
    }
  });

  socket.on("disconnect", () => {
    const username = socket.data.username;
    if (!username) return;
    const remainingConnections = (onlineUsers.get(username) || 1) - 1;
    if (remainingConnections > 0) onlineUsers.set(username, remainingConnections);
    else onlineUsers.delete(username);
    broadcastPresence();
  });
});

httpServer.listen(3000, () => {
  console.log("running on http://localhost:3000");
});

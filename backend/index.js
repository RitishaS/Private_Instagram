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
    .then((result) => res.json(result))
    .catch((err) => {
      res.status(500).json({ error: "Error fetching posts", details: err });
    })
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
  let client = new MongoClient(url);
  let db = client.db("insta");
  let collec = db.collection("photos");
  let id = req.params.id;
  let _id = new ObjectId(id);
  
  collec.findOne({_id})
  .then((post)=>{
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
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
    res.json({ success: true, message: "Post deleted successfully" });
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

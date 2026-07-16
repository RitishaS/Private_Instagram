let express = require("express");
let multer = require("multer");
let { MongoClient, ObjectId } = require("mongodb");
let path = require("path");
let fs = require("fs");
let cors = require("cors");
let cloudinary = require("cloudinary").v2;
let{CloudinaryStorage}=require("multer-storage-cloudinary");

cloudinary.config({
cloud_name: "dx1lweizb",
api_key: "241197616858346",
api_secret: "V0EAGjl4SLxNJenUf2dL0k7QX_c"
});

const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(cors());

// Hardcoded Users
const users = [
  { username: "Manan", password: "Ritisha" },
  { username: "Ritisha", password: "Ritisha" }
];

const url = "mongodb://0.0.0.0:27017";

// let storage=multer.diskStorage(
//     {
//         destination:(req,file,cb)=>cb(null,"uploads/"),
//         filename:(req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
//     }
// );

let storage = new CloudinaryStorage({cloudinary});

let upload = multer({storage});

// Middleware to handle image upload only
let uploadImage = upload.single('image');

// Authentication check function
const authenticateUser = (username, password) => {
  return users.some(user => user.username === username && user.password === password);
};

app.post("/upload", uploadImage, (req, res) => {
    const { username, password, caption, songId, songTitle, songChannel } = req.body;
    
    // Check if user is authorized
    if (!authenticateUser(username, password)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Check if image is provided
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    let client = new MongoClient(url);
    let db = client.db("insta");
    let collection = db.collection("photos");
    
    let obj = {
        username: username,
        caption: caption,
        image_url: req.file.path,
        image_name: req.file.filename,
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
  let username=req.query.username;
  let obj=username?{username}:{};
      let db = client.db("insta");
      let collec= db.collection("photos");
      collec.find(obj).toArray()
    .then((result) => res.json(result))
    .catch((err) => {
      res.send(err);
    })
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
    
    // Delete image from Cloudinary
    if (post.image_name) {
      cloudinary.uploader.destroy(post.image_name, (error, result) => {
        if (error) console.log("Error deleting image:", error);
      });
    }
    
    return collec.deleteOne({_id});
  })
  .then((result)=> {
    res.json({ success: true, message: "Post deleted successfully" });
  })
  .catch((err)=> {
    res.status(500).json({ error: "Error deleting post", details: err });
  });
});

app.listen(3000, () => {
  console.log("running on http://localhost:3000");
});
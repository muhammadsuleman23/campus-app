const Roommate = require("../models/Roommate");

// 1. Get All Posts (closed ones auto-hidden — see Roommate.activeWhere)
const getRoommatePosts = async (req, res) => {
  try {
    const posts = await Roommate.findActive().populate("user", "name email").sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
};

// 2. Get Single Post
const getRoommatePostById = async (req, res) => {
  try {
    const post = await Roommate.findById(req.params.id).populate("user", "name email");
    if (post) res.json(post);
    else res.status(404).json({ message: "Post not found" });
  } catch (error) { res.status(500).json({ message: "Server Error" }); }
};

// 3. Create Post
const createRoommatePost = async (req, res) => {
  try {
    const { type, location, budget, gender, contact, description, tags, images } = req.body;

    if (!type || !location || !budget || !contact || !description) {
      return res.status(400).json({ message: "Please fill required fields" });
    }

    const post = await Roommate.create({
      user: req.user._id,
      type, location, budget, gender, contact, description, tags, images
    });

    res.status(201).json(post);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 4. Update Post
const updateRoommatePost = async (req, res) => {
  try {
    const post = await Roommate.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });

    if (req.body.type !== undefined) post.type = req.body.type;
    if (req.body.location !== undefined) post.location = req.body.location;
    if (req.body.budget !== undefined) post.budget = req.body.budget;
    if (req.body.gender !== undefined) post.gender = req.body.gender;
    if (req.body.contact !== undefined) post.contact = req.body.contact;
    if (req.body.description !== undefined) post.description = req.body.description;
    if (req.body.tags !== undefined) post.tags = req.body.tags;
    if (req.body.images !== undefined) post.images = req.body.images;
    if (req.body.isClosed !== undefined) post.isClosed = req.body.isClosed;

    const updatedPost = await post.save();
    res.json(updatedPost);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 5. Delete Post
const deleteRoommatePost = async (req, res) => {
  try {
    const post = await Roommate.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });
    if (post.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });

    await post.deleteOne();
    res.json({ message: "Post Removed" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getRoommatePosts, getRoommatePostById, createRoommatePost, updateRoommatePost, deleteRoommatePost };
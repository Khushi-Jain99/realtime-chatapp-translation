const router = require("express").Router();
const User = require("./../models/user");
const authMiddleware = require("./../middlewares/authMiddleware");
const { decode } = require("jsonwebtoken");
const cloudinary = require('./../cloudinary');

// GET details of the currently logged-in user
router.get("/get-logged-user", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    res.send({
      message: "User details fetched successfully",
      success: true,
      data: user,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

// Get all users except the currently logged-in user
router.get("/get-all-users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } });
    res.send({
      message: "All users details fetched successfully",
      success: true,
      data: users,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

// Cloudinary
router.post('/upload-profile-pic', authMiddleware, async (req, res) => {
  try {
    const image = req.body.image;

    // Upload the image to cloudinary
    const uploadedImage = await cloudinary.uploader.upload(image, {
      folder: 'chat-app'
    })

    // Update the user model & set the profile pic property
    const user = await User.findByIdAndUpdate(
      {_id: req.body.userId},
      {profilePic: uploadedImage.secure_url},
      {new: true}
    );

    res.send({
      message: "Profile picture uploaded",
      success: true,
      data: user
    })
    
  } catch (error) {
    res.send({
      message: error.message,
      success: false 
    })
  }s
})

module.exports = router;

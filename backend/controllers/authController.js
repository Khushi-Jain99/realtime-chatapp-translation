const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./../models/user");

// Signup API
router.post("/signup", async (req, res) => {
  try {
    // 1. If the user already exists
    const user = await User.findOne({ email: req.body.email });
    // 2. If the user already exists, send an error message
    if (user) {
      return res.status(400).send({
        message: "User already exists",
        success: false,
      });
    }
    // 3. Encrypt the password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    req.body.password = hashedPassword;
    // 4. Create a new user, Save it to the database
    const newUser = new User(req.body);
    await newUser.save();

    res.status(201).send({
      message: "User created successfully",
      success: true,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

// Login API
router.post("/login", async (req, res) => {
  try {
    // 1. Check if the user already exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.send({
        message: "User does not exist",
        success: false,
      });
    }
    // 2. Check if the password is correct
    const isValid = await bcrypt.compare(req.body.password, user.password);
    if (!isValid) {
      return res.send({
        message: "Invalid password",
        success: false,
      });
    }
    // 3. If the user exists and the password is correct, assign a JWT
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, {
      expiresIn: "30d",
    });

    res.send({
      message: "Login successful",
      success: true,
      token: token,
    });
  } catch (error) {
    res.send({
      message: error.message,
      success: false,
    });
  }
});

module.exports = router;

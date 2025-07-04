const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const userSchema = require("../models/homeSchema");
const sendWelcomeEmail = require("../utils/mailer"); // ADD THIS LINE


// Registration Page
router.get("/", (req, res) => {
  res.render("register", { errors: [], old: {}, success: "" });
});

// Register Handle with Validation
router.post("/register", [
  body("name").notEmpty().withMessage("Name is required"),
  body("email")
    .isEmail().withMessage("Enter a valid email")
    .custom(async (email) => {
      const existingUser = await userSchema.findOne({ email });
      if (existingUser) {
        throw new Error("Email already exists");
      }
      return true;
    }),
  body("password")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("cpassword")
    .custom((cpassword, { req }) => {
      if (cpassword !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    })
], async (req, res) => {
  const errors = validationResult(req);
  const { name, email, password } = req.body;

  if (!errors.isEmpty()) {
    return res.render("register", {
      errors: errors.array(),
      old: req.body,
      success: ""
    });
  }

  try {
    const user = new userSchema({ name, email, password });
    await user.save();

    //EMAIL SENDER FUNCTIONCALL
    await sendWelcomeEmail(email,name)

    res.render("register", {
      errors: [],
      old: {},
      success: "Registration successful ! Check your email ! And Login Now "
    });
  } catch (err) {
    console.log(err);
    res.render("register", {
      errors: [{ msg: "Something went wrong" }],
      old: req.body,
      success: ""
    });
  }
});


// Login Page
router.get("/login", (req, res) => {
  res.render("login", { error: "", old: {} });
});

// Login Handle
router.post("/login", [
  body("email").isEmail().withMessage("Enter a valid email"),
  body("password").notEmpty().withMessage("Password is required")
], async (req, res) => {
  const errors = validationResult(req);
  const { email, password } = req.body;

  if (!errors.isEmpty()) {
    return res.render("login", {
      error: errors.array()[0].msg,
      old: req.body
    });
  }

  try {
    const user = await userSchema.findOne({ email });

    if (!user || user.password !== password) {
      return res.render("login", {
        error: "Invalid email or password",
        old: req.body
      });
    }

    res.render("dashboard", { name: user.name });

  } catch (err) {
    console.log(err);
    res.render("login", {
      error: "Server error",
      old: req.body
    });
  }
});

module.exports = router;

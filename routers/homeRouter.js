const express = require("express");
const { body, validationResult } = require("express-validator");
const router = express.Router();
const userSchema = require("../models/homeSchema");
const attendanceSchema = require("../models/attendanceSchema");
const sendWelcomeEmail = require("../utils/mailer");
const moment = require("moment");

// Registration Page
router.get("/", (req, res) => {
  res.render("register", { errors: [], old: {}, success: "" });
});


// Register
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
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("cpassword").custom((cpassword, { req }) => {
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

    // Send welcome email
    await sendWelcomeEmail(email, name);

    // 🔄 Redirect to login page instead of showing message
    res.redirect("/login");

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

    // ✅ Store user info in session
    req.session.userId = user._id;
    req.session.email = user.email;

    // ✅ Admin user redirect directly to admin panel
    if (user.email === "admin@gmail.com" && user.password === "adminn") {
      return res.redirect("/admin");
    }

    // ✅ Mark attendance for normal users (not admin)
    const today = moment().startOf('day');
    let attendance = await attendanceSchema.findOne({
      userId: user._id,
      loginTime: { $gte: today.toDate() }
    });

    if (!attendance) {
      attendance = new attendanceSchema({
        userId: user._id,
        loginTime: new Date()
      });
      await attendance.save();
    }

    res.redirect("/dashboard");

  } catch (err) {
    console.log(err);
    res.render("login", {
      error: "Server error",
      old: req.body
    });
  }
});


// Dashboard Page
router.get("/dashboard", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  const user = await userSchema.findById(req.session.userId);
  if (!user) return res.redirect("/login");

  res.render("dashboard", { name: user.name, userId: user._id });
});


// Lunch Out
router.post("/lunchout", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).send("Missing userId");

    const today = moment().startOf("day");
    const attendance = await attendanceSchema.findOne({
      userId,
      loginTime: { $gte: today.toDate() }
    });

    if (attendance) {
      attendance.lunchOut = new Date();
      await attendance.save();
      res.redirect("/dashboard?msg=lunchout"); // ✅ success message
    } else {
      res.send("Attendance not found");
    }
  } catch (err) {
    console.error("Lunch Out error:", err);
    res.status(500).send("Server Error");
  }
});

// Lunch In
router.post("/lunchin", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).send("Missing userId");

    const today = moment().startOf("day");
    const attendance = await attendanceSchema.findOne({
      userId,
      loginTime: { $gte: today.toDate() }
    });

    if (attendance) {
      attendance.lunchIn = new Date();
      await attendance.save();
      res.redirect("/dashboard?msg=lunchin"); // ✅ success message
    } else {
      res.send("Attendance not found");
    }
  } catch (err) {
    console.error("Lunch In error:", err);
    res.status(500).send("Server Error");
  }
});

// Admin Panel
router.get("/admin", async (req, res) => {
  try {
    // ✅ Only allow if logged in user is admin@gmail.com
    if (!req.session.email || req.session.email !== "admin@gmail.com") {
      return res.status(403).send("Access Denied: Admins only");
    }

    const { filter, date } = req.query;
    const attendance = await attendanceSchema.find().populate("userId");

    const START_TIME = moment("09:00:00", "HH:mm:ss");
    let filteredData = attendance;

    if (filter && date) {
      const inputDate = moment(date);

      filteredData = attendance.filter(entry => {
        const loginMoment = moment(entry.loginTime);
        if (filter === "day") return loginMoment.isSame(inputDate, 'day');
        if (filter === "week") return loginMoment.isSame(inputDate, 'week');
        if (filter === "month") return loginMoment.isSame(inputDate, 'month');
        if (filter === "year") return loginMoment.isSame(inputDate, 'year');
        return true;
      });
    }

    const records = filteredData
      .map(entry => {
        const user = entry.userId;
        if (!user) return null;

        const loginMoment = moment(entry.loginTime);
        const dayStart = START_TIME.clone().set({
          year: loginMoment.year(),
          month: loginMoment.month(),
          date: loginMoment.date()
        });

        const isLate = loginMoment.isAfter(dayStart);

        let lunchDuration = "-";
        let isLateFromLunch = false;

        if (entry.lunchOut && entry.lunchIn) {
          const lunchOut = moment(entry.lunchOut);
          const lunchIn = moment(entry.lunchIn);
          const diffMinutes = lunchIn.diff(lunchOut, 'minutes');
          lunchDuration = diffMinutes;
          isLateFromLunch = diffMinutes >= 1;
        }

        return {
          name: user.name,
          loginTime: loginMoment.format("hh:mm A"),
          lunchOut: entry.lunchOut ? moment(entry.lunchOut).format("hh:mm A") : "-",
          lunchIn: entry.lunchIn ? moment(entry.lunchIn).format("hh:mm A") : "-",
          isLate,
          lunchDuration,
          isLateFromLunch
        };
      })
      .filter(r => r !== null);

    res.render("admin", { records, filter, date });

  } catch (err) {
    console.error("Admin panel error:", err);
    res.status(500).send("Internal Server Error");
  }
});


module.exports = router;

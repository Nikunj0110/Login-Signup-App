const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: 'your_secret_key_here',
  resave: false,
  saveUninitialized: false
}));

// Connect DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ MongoDB error", err));

// Routes
const homeRouter = require('./routers/homeRouter');
app.use('/', homeRouter);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

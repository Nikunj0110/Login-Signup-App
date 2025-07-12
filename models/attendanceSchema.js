const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const attendanceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "registerUser",
    required: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lunchOut: Date,
  lunchIn: Date,
  logoutTime: Date
});

module.exports = mongoose.model("Attendance", attendanceSchema);

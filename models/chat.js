var mongoose = require('mongoose');

var schema = mongoose.Schema({
  sender: Object,
  recipient: Object,
  message: String,
  identifier: String,
  date: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('chat', schema);
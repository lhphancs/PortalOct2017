var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var saltRounds = 10;

var userSchema = mongoose.Schema({
  name: String,
  email: String,
  password: String,
  // location: {
  //   name: { type: String },
  //   geo: {
  //     type: { type: String },
  //     coordinates: { type: Array },
  //   }
  // },
  description: String,
  tags: [String],
  education: String,
  friends: [String],
  pendingFriends: [String],
  photo: String
});

// userSchema.index({'location.geo': '2dsphere'});

class UserClass {
  static hashPassword(password) {
    return bcrypt.hashSync(password, saltRounds);
  }

  checkPassword(password) {
    return bcrypt.compareSync(password, this.password);
  }
}

userSchema.loadClass(UserClass);


module.exports = mongoose.model('user', userSchema);
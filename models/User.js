const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		required:  true,
	}, 
	password: {
		type: String,
		required: true
	},
	conversations: {
		type: Array,
		required: true
	},
	unseenMessages: {
		type: Array,
		required: true
	}
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
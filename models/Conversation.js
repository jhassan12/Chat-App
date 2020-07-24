const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
	type: {
		type: Number,
		required: true
	},

	name: {
		type: String
	},

	users: {
		type: Array,
		required: true
	},

	lastMessage: {
		type: String
	}
});

const Conversation = mongoose.model('Conversation', ConversationSchema);
module.exports = Conversation;
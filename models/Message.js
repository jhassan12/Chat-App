const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
	senderID: {
		type: String,
		required: true
	},

	senderName: {
		type: String,
		required: true
	},
	
	content: {
		type: String,
		required: true
	},

	conversationID: {
		type: String,
		required: true
	}
});

const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
const Conversation = require('./models/Conversation.js');
const Message = require('./models/Message.js');
const User = require('./models/User.js');

var io = null;

var ObjectId = require('mongodb').ObjectId;

const communityConversationID = '5ef3e40a1371e55c7cd1dc94';

var rooms = {};
var users = {};

var recentMessagesCache = {};
var searchResultsCache = {};

class Room {
	constructor(id) {
		this.id = id;
		this.connectedUsers = [];
		this.onlineUsers = new Set();
	}
}

function isCommunity(conversationID) {
	return conversationID === communityConversationID;
}

async function setUsersOfConversation(conversationID, users) {
	try {
		Conversation.updateOne({_id: conversationID}, {$set: {users: users}}, function(err, res){
			if (err) {
				console.log(err);
			}
		});
		
	} catch(err) {
		console.log(err);
	}
}

function addUsersToConversation(conversationID, users) {
	for (const user of users) {
		addUserToConversation(user);
	}
}

async function addUserToConversation(conversationID, user) {
	try {
		const users = await getUsersOfConversation(conversationID);
		const userID = await getUserID(user);

		Conversation.updateOne({_id: conversationID}, {$addToSet: {users: userID}}, function(err, res){
			if (err) {
				console.log(err);
			}
		});
		
	} catch(err) {
		console.log(err);
	}
}

async function getUser(username) {
	try {
		const user = await User.findOne({username: username});
		return user;
	} catch(err) {
		console.log(err);
		return null;
	}
}

async function getUserID(username) {
	const user = await getUser(username);

	if (user) {
		return (user) ? user._id : null;
	} else {
		return null;
	}
}

async function getUsername(userID) {
	try {
		const user = await User.findOne({_id: userID});
		return (user) ? user.username : null;
	} catch(err) {
		console.log(err);
		return null;
	}
}

async function getConversationsOfUser(username) {
	const user = await getUser(username);

	if (user) {
		return (user) ? user.conversations : null;
	} else {
		return null;
	}
}

async function updateConversationsOfUser(username, conversationID) {
	const user = await getUser(username);
	const conversations = user.conversations;
	const unseenMessages = user.unseenMessages;

	var index = conversations.indexOf(conversationID);

	if (index !== -1) {
		let id = conversations[index];
		let unseen = unseenMessages[index];

		conversations.splice(index, 1);
		unseenMessages.splice(index, 1);

		conversations.unshift(id);
		unseenMessages.unshift(unseen);
	} else {
		conversations.unshift(conversationID);
		unseenMessages.unshift(0);
	}

	try {
		await User.updateOne({username: username}, {$set: {conversations: conversations, unseenMessages: unseenMessages}}, async function(err, res){
			if (err) {
				console.log(err);
			} else {
				const conversation = await getConversation(conversationID);

				if (conversation.lastMessage === null && conversation.type === 1) {
					return;
				}

				const recentMessage = await createRecentMessage(username, conversationID);

				io.sockets.in(username).emit('add-recent-message', recentMessage);
			}
		});
	} catch(err) {
		console.log(err);
	}
}

async function checkIfUsersSeenMessages(username, conversationID, mode, count) {
	const conversationUsers = await getUsersOfConversation(conversationID);
	const currentUsersInRoom = rooms[conversationID].onlineUsers;

	for (const userID of conversationUsers) {
		let name = await getUsername(userID);

		if (!currentUsersInRoom.has(name)) {
			updateUnseenMessages(name, conversationID, mode, count).then(() => {
				if (mode !== 2) {
					updateConversationsOfUser(name, conversationID);
				}
			})
		} else {
			updateConversationsOfUser(name, conversationID);
		}
	}
}

async function getConversation(conversationID) {
	try {
		const conversation = await Conversation.findOne({_id: conversationID});
		return conversation;
	} catch(err) {
		console.log(err);
		return null;
	}
} 

async function getConversationName(conversationID) {
	const conversation = await getConversation(conversationID);
	
	if (conversation && conversation.name) {
		return conversation.name;
	} else {
		return null;
	}
}

async function getConversationLastMessage(conversationID) {
	const conversation = await getConversation(conversationID);

	if (conversation && conversation.lastMessage) {
		return conversation.lastMessage;
	} else {
		return null;
	}
}

async function getUsersOfConversation(conversationID) {
	try {
		const conversation = await Conversation.findOne({_id: conversationID});
		return (conversation) ? conversation.users : null;
	} catch(err) {
		console.log(err);
		return null;
	}
}

async function updateConversationLastMessage(messageID, conversationID) {
	try {
		Conversation.updateOne({_id: conversationID}, {$set: {lastMessage: messageID}}, function(err, res){
			if (err) {
				console.log(err);
			}
		});
	} catch(err) {
		console.log(err);
	}
}

async function conversationHasUser(username, conversationID) {
	const userID = await getUserID(username);
	const users = await getUsersOfConversation(conversationID);

	if (!userID || !users) {
		return false;
	}

	return users.includes(userID);
}

async function conversationExists(conversationID) {
	try {
		const conversation = await Conversation.findOne({_id: conversationID});
		return conversation !== null;
	} catch(err) {
		console.log(err);
		return false;
	}
}

function isValidObjectID(id) {
	return id.match(/^[0-9a-fA-F]{24}$/);
}

async function createConversation(type, name, users) {
	const userIDs = await Promise.all(users.map(async (user) => getUserID(user)));

	const conversation = new Conversation({
		type: type,
		name: name,
		users: userIDs,
		lastMessage: null
	});

	await conversation.save();

	for (const user of users) {
		await updateConversationsOfUser(user, conversation._id);
	}

	return conversation._id;
} 

async function createPrivateConversation(users) {
	return await createConversation(1, null, users);
}

async function createGroupConversation(users, name) {
	return await createConversation(2, name, users);
}

async function findPrivateConversation(user1, user2) {
	const userID1 = await getUserID(user1);
	const userID2 = await getUserID(user2);

	const conversations = await getConversationsOfUser(user1);

	for (const conversationID of conversations) {
		let conversation = await getConversation(conversationID);
		let conversationUsers = conversation.users;
		let conversationType = conversation.type;

		if (conversationType == 1 && conversationUsers.includes(userID1) && conversationUsers.includes(userID2)) {
			return conversationID;
		}
	}

	return null;
}

async function getOtherPrivateChatUsername(username, users) {
	var userID = await getUserID(username);
	userID = userID.toString();

	for (const user of users) {
		if (userID != user) {
			let name = await getUsername(user);
			return await getUsername(user);
		}
	}
}

async function updatePlaceholderText(socket, username, conversationID) {
	const placeholderText = await generatePlaceholderText(username, conversationID);

	socket.emit('set-placeholder', {text: placeholderText});
}

async function generatePlaceholderText(username, conversationID) {
	const conversation = await getConversation(conversationID);
	var text = 'Send message';

	if (conversation && conversation.name) {
		text += ` in ${conversation.name}`;
	} else {
		const otherUsername = await getOtherPrivateChatUsername(username, conversation.users);
		text += ` to ${otherUsername}`;
	}

	return text;
}

async function updateClientTotalUnseenMessageCount(username, conversationID, delta) {
	var recentMessages = await getRecentMessages(username);
	var count = getUnseenMessageCount(recentMessages);

	io.sockets.in(username).emit('update-unseen-message-count', count + delta);
}

async function incrementUnseenMessages(username, conversationID) {
	if (!isCommunity(conversationID)) {
		const conversationUsers = await getUsersOfConversation(conversationID);
		
		checkIfUsersSeenMessages(username, conversationID, 1, null);
	}
}

async function storeMessage(socket, username, content, conversationID, temporaryID) {
	const userID = await getUserID(username);

	const newMessage = new Message({
		senderID: userID,
		senderName: username,
		content: content,
		conversationID: conversationID
	});

	const messageObject = {
		_id: newMessage._id,
		senderName: username,
		content: content, 
		temporaryID: temporaryID
	};

	socket.emit('send-message', messageObject);
	messageObject.temporaryID = null;
	socket.broadcast.to(conversationID).emit('send-message', messageObject);

	await newMessage.save();
	await updateConversationLastMessage(newMessage._id, conversationID).then(incrementUnseenMessages(username, conversationID));
}

function getTimestamp(id) {
	var timestamp = id.toString().substring(0,8);
	return new Date(parseInt(timestamp, 16) * 1000);
}

async function getLastMessageID(date, conversationID) {
	try {
		const message = await Message.find({conversationID: conversationID, _id: {$lt: ObjectId.createFromTime(date.getTime() / 1000)}}).sort({_id: -1}).limit(1);
		return (message.length) ? message[0]._id : "";
	} catch (err) {
		console.log(err);
		return null;
	}
}

async function getMessageBefore(messageID, conversationID) {
	const date = getTimestamp(messageID);
	const messageBefore = await getLastMessageID(date, conversationID);
	var count = undefined;

	try {
		var count = await Message.countDocuments({conversationID: conversationID, _id: {$gt: ObjectId.createFromTime(date.getTime() / 1000)}});

		return {
			lastMessageID: messageBefore,
			count: count
		}
	} catch (err) {
		console.log(err);
		return null;
	}
}

async function decrementUnseenMessages(count, username, conversationID) {
	if (!isCommunity(conversationID)) {
		const conversationUsers = await getUsersOfConversation(conversationID);
		
		checkIfUsersSeenMessages(username, conversationID, 2, count).then(async () => {
			for (const user of conversationUsers) {
				let name = await getUsername(user);
				let recentMessage = await createRecentMessage(name, conversationID);

				io.sockets.in(name).emit('remove-recent-message', recentMessage);
			}
		});
	}
}

async function removeMessage(username, messageID, conversationID) {
	const obj = await getMessageBefore(messageID, conversationID);

	if (!obj) {
		return;
	}

	const {lastMessageID, count} = obj;

	if (count === 1) {
		updateConversationLastMessage(lastMessageID, conversationID).then(() => {
			decrementUnseenMessages(count, username, conversationID);
		});
	} else {
		decrementUnseenMessages(count, username, conversationID);
	}

	Message.deleteOne({_id : messageID}, function(err){
		if (err) {
			console.log(err);
		}
	});
}

async function loadMessagesWithSearch(socket, conversationID, search, fetch) {
	var message = await getMessage(search.searchMessageID);

	var messageBefore = await getMessageBefore(search.searchMessageID, conversationID);
	var skip = 0;

	if (fetch) {
		skip = search.messagesLoaded;
	}

	var limit = messageBefore.count - skip + 4;

	if (!message) {
		if (fetch) {
			return;
		} else {
			limit = 10;
		}
	}

	Message.find({conversationID: conversationID}).sort({_id: -1}).skip(skip).limit(limit).exec(async function(err, messages){
		let addLoadAnimation = true;

		if (messageBefore.count + 4 !== messages.length) {
			addLoadAnimation = false;
		}

		messageBefore = await getMessageBefore(messages[0]._id, conversationID);

		if (!messageBefore.lastMessageID) {
			addLoadAnimation = false;
		}

		let obj = {
			messages: messages,
			addLoadAnimation,
			search: search
		}

		if (fetch) {
			socket.emit('load-fetched-messages', obj);
		} else {
			socket.emit('load-messages', obj);
		}
	});
	
}

function loadMessages(socket, conversationID) {
	fetchMessages(socket, 0, conversationID, true);
}

function fetchMessages(socket, messagesLoaded, conversationID, initialLoad) {
	Message.find({conversationID: conversationID}).sort({_id: -1}).skip(messagesLoaded).limit(10).exec(async function(err, messages) {
		if (err) {
			console.log(err);
		} else {
			let lastMessage = messages[messages.length - 1];
			let addLoadAnimation = false;

			if (lastMessage) {
				let messageBefore = await getMessageBefore(lastMessage._id, conversationID);
			
				if (messageBefore.lastMessageID) {
					addLoadAnimation = true;
				}
			}

			const obj = {
				messages: messages,
				addLoadAnimation,
			};

			if (initialLoad) {
				socket.emit('load-messages', obj);
			} else {
				socket.emit('load-fetched-messages', obj);
			}
		}
	});
}

function loadUsers(socket, users) {
	socket.emit('load-users', {users: users});
}

async function isUnseenMessage(username, conversationID) {
	var unseen = await getUnseenMessages(username, conversationsID);

	return unseen > 0;
}

function getUnseenMessageCount(recentMessages) {
	var count = 0;

	recentMessages.forEach(function(message) {
		if (message.unseen) {
			count++;
		}
	});

	return count;
}

async function getRecentMessages(username) {
	var recentMessages = await getConversationsOfUser(username);

	recentMessages = await Promise.all(recentMessages.map(async (conversationID) => createRecentMessage(username, conversationID)));

	recentMessages = recentMessages.filter(function(message){
			return message != null;
	});

	return recentMessages;
}

async function loadRecentMessages(socket, username, loaded) {
	var recentMessages, addLoadAnimation;

	if (!recentMessagesCache[username]) {
		recentMessages = await getRecentMessages(username);

		recentMessagesCache[username] = recentMessages;
		addLoadAnimation = loaded + 8 <= recentMessagesCache[username].length;
		recentMessages = recentMessages.slice(loaded, loaded + 7);
	} else {
		recentMessages = recentMessagesCache[username].slice(loaded, loaded + 7);
		addLoadAnimation = recentMessages.length >= 8;
	}

	socket.emit('load-recent-messages', {messages: recentMessages, addLoadAnimation: addLoadAnimation});

	if (!loaded) {
		socket.emit('update-unseen-message-count', getUnseenMessageCount(recentMessagesCache[username]));
	}
}

async function createRecentMessage(username, conversationID) {
	const conversation = await getConversation(conversationID);
	const conversationName = conversation.name;
	const conversationUsers = conversation.users;

	if (conversation.lastMessage === null && conversation.type === 1) {
		return null;
	}

	const lastMessageID = conversation.lastMessage;
	const lastMessage = (lastMessageID) ? await getMessage(lastMessageID) : null;

	var [title, content, unseen] = [null, null, null];

	title = conversationName || await getOtherPrivateChatUsername(username, conversationUsers);
	
	if (lastMessage) {
		const [lastMessageSenderName, lastMessageContent] = [lastMessage.senderName, lastMessage.content];
		content = (username === lastMessageSenderName) ? lastMessage.content : lastMessageSenderName + ': ' + lastMessageContent;
	} else {
		content = 'No messages...yet';
	}

	unseen = await getUnseenMessages(username, conversationID);

	const recentMessage = {
		title: title,
		content: content,
		conversationID: conversationID,
		messageID: lastMessageID,
		unseen: unseen 
	};

	return recentMessage;
}

async function getUnseenMessages(username, conversationID) {
	const user = await getUser(username);
	const conversations = user.conversations;
	const unseenMessages = user.unseenMessages;

	var index = conversations.indexOf(conversationID);

	return unseenMessages[index];
}

async function updateUnseenMessages(username, conversationID, mode, count) {
	const user = await getUser(username);
	const conversations = user.conversations;
	const unseenMessages = user.unseenMessages;

	var index = conversations.indexOf(conversationID);
	var unseen = unseenMessages[index];
	var updatedValue = unseen;

	if (mode === 0) {
		updatedValue = 0;
	} else if (mode === 1) {
		updatedValue++;
	} else if (mode === 2 && count <= unseen) {
		updatedValue--;
	}

	unseenMessages[index] = updatedValue;

	if (updatedValue !== unseen) {

		if (unseen && !updatedValue) {
			await updateClientTotalUnseenMessageCount(username, conversationID, -1);
		} else if (!unseen && updatedValue) {
			await updateClientTotalUnseenMessageCount(username, conversationID, 1);
		}

		try {
			await User.updateOne({username: username}, {$set: {unseenMessages: unseenMessages}}, function(err, res){
				if (err) {
					console.log(err);
				}
			});
		} catch(err) {
			console.log(err);
		}
	}
}


async function getMessage(messageID) {
	try {
		const message = await Message.findOne({_id: messageID});
		return message;
	} catch(err) {
		console.log(err);
		return null;
	}
}

function userExists(username, connectedUsers) {
	for (const socket of connectedUsers) {
		if (socket.username === username) {
			return true;
		}
	}

	return false;
}

function changeRoom(socket, username, oldConversationID, newConversationID, search) {
	if (oldConversationID === newConversationID) {
		if (search) {
			loadMessagesWithSearch(socket, oldConversationID, search, true);
		}
		return;
	}

	if (!rooms[oldConversationID]) {
		rooms[oldConversationID] = new Room(oldConversationID);
	}

	socket.leave(oldConversationID);

	if (!isCommunity(oldConversationID)) {
		disconnectFromRoom(socket, oldConversationID);
	} else {
		const connectedUsers = rooms[oldConversationID].connectedUsers;
		const index = connectedUsers.indexOf(socket);

		if (index !== -1) {
			connectedUsers.splice(index, 1);
		}
	}

	connectToRoom(socket, username, newConversationID, search);
}

function disconnectFromRoom(socket, conversationID) {
	const username = socket.username;
	const connectedUsers = rooms[conversationID].connectedUsers;
	const onlineUsers = rooms[conversationID].onlineUsers;
	const index = connectedUsers.indexOf(socket);

	if (!rooms[conversationID]) {
		return;
	}

	if (index !== -1) {
		connectedUsers.splice(index, 1);
	} 

	if (!userExists(username, connectedUsers)) {
		io.sockets.in(conversationID).emit('disconnect-user', username);
		onlineUsers.delete(username);
		console.log(`${username} has disconnected from ROOM ${conversationID}`);
	}
}

function connectToRoom(socket, username, conversationID, search) {
	if (!updateOnlineUsers(socket, username, conversationID)) {
		return;
	}

	const connectedUsers = rooms[conversationID].connectedUsers;
	const onlineUsers = rooms[conversationID].onlineUsers;

	var isRoomCommunity = isCommunity(conversationID);

	socket.emit('prepare-room-change', {
		conversationID: conversationID,
		redirect: !isRoomCommunity,
	});

	updatePlaceholderText(socket, username, conversationID);
	loadUsers(socket, Array.from(onlineUsers).sort());

	if (!search) {
		loadMessages(socket, conversationID);	
	} else {
		loadMessagesWithSearch(socket, conversationID, search);
	}

	if (!isRoomCommunity) {
		updateUnseenMessages(username, conversationID, 0, null);
		io.sockets.in(username).emit('seen-message', conversationID);
	}
}

function updateOnlineUsers(socket, username, conversationID) {
	if (!rooms[conversationID]) {
		rooms[conversationID] = new Room(conversationID);
	}

	const connectedUsers = rooms[conversationID].connectedUsers;
	const onlineUsers = rooms[conversationID].onlineUsers;

	if (connectedUsers.includes(socket)) {
		return false;
	}

	socket.username = username;
	socket.conversationID = conversationID;

	socket.join(conversationID);
	connectedUsers.push(socket);

	var isRoomCommunity = isCommunity(conversationID);

	if (isRoomCommunity) {
		addUserToConversation(conversationID, username);
	}

	if (!isRoomCommunity && !rooms[communityConversationID].onlineUsers.has(username)) {
		socket.broadcast.to(communityConversationID).emit('add-user', username);
		rooms[communityConversationID].onlineUsers.add(username);
	}

	if (!onlineUsers.has(username)) {
		socket.broadcast.to(conversationID).emit('add-user', username);
		onlineUsers.add(username)
		console.log(`${username} has connected to ROOM ${conversationID}`);
	}

	return true;
}

async function queryUsers(query, username, loaded) {
	try {
		var users = await User.find({username: {$regex: query, $options: "i" }});
		var index;

		users = users.map(user => user.username);
		index = users.indexOf(username);

		if (index !== -1) {
			users.splice(index, 1);
		}

		return users;
	} catch (err) {
		console.log(err);
		return null;
	}
}

async function createRecentMessage(username, conversationID) {
	const conversation = await getConversation(conversationID);
	const conversationName = conversation.name;
	const conversationUsers = conversation.users;

	if (conversation.lastMessage === null && conversation.type === 1) {
		return null;
	}

	const lastMessageID = conversation.lastMessage;
	const lastMessage = (lastMessageID) ? await getMessage(lastMessageID) : null;

	var [title, content, unseen] = [null, null, null];

	title = conversationName || await getOtherPrivateChatUsername(username, conversationUsers);
	
	if (lastMessage) {
		const [lastMessageSenderName, lastMessageContent] = [lastMessage.senderName, lastMessage.content];
		content = (username === lastMessageSenderName) ? lastMessage.content : lastMessageSenderName + ': ' + lastMessageContent;
	} else {
		content = 'No messages...yet';
	}

	unseen = await getUnseenMessages(username, conversationID);

	const recentMessage = {
		title: title,
		content: content,
		conversationID: conversationID,
		messageID: lastMessageID,
		unseen: unseen 
	};

	return recentMessage;
}

async function createSearchMessage(message, username) {
	const conversationID = message.conversationID;
	const conversation = await getConversation(conversationID);
	const conversationUsers = conversation.users;
	var conversationName = conversation.name;

	if (!conversationName) {
		conversationName = await getOtherPrivateChatUsername(username, conversationUsers);
	}

	const recentMessage = {
		title: conversationName,
		content: message.senderName === username ? message.content : message.senderName + ': ' + message.content,
		conversationID: conversationID,
		messageID: message._id,
		unseen: 0 
	};

	return recentMessage;
}


async function queryMessages(query, username, loaded) {
	var conversations = await getConversationsOfUser(username);
	var messages = [], count = 0;

	conversations.push(communityConversationID);

	for (const conversationID of conversations) {
		try {
			let pattern = `\\b${query}`;
			let regex = new RegExp(pattern);

			const foundMessages = await Message.find({content: {$regex: regex, $options: "i"}, conversationID: conversationID}).sort({_id: -1}).select({"senderName": 1, "content": 1, "conversationID": 1});

			messages = mergeMessages(messages, foundMessages);

		} catch (err) {
			console.log(err);
			return null;
		}
	}

	messages = await Promise.all(messages.map(async (message) => createSearchMessage(message, username)));

	return messages;
}

function mergeMessages(arr1, arr2) {
	var arr3 = [], i = 0, j = 0;

	while (i < arr1.length && j < arr2.length) {
		let m1 = arr1[i], m2 = arr2[j];
		let t1 = m1._id.getTimestamp(), t2 = m2._id.getTimestamp();

		if (t1 >= t2) {
			arr3.push(arr1[i++]);
		} else {
			arr3.push(arr2[j++]);
		}
	}

	while (i < arr1.length) {
		arr3.push(arr1[i++]);
	}

	while (j < arr2.length) {
		arr3.push(arr2[j++]);
	}

	return arr3;
}

async function validateSocket(socket) {
	var session = socket.request.session;
	if (!session.passport || !session.passport.user) {
		socket.emit('logout');

		try{
			socket.removeAllListeners();
		} catch(err) {
			console.log(err);
		}
		
		return false;
	}

	return true;
}

async function validateConversation(username, conversationID) {
	var doesExist = await conversationExists(conversationID);
	var isUserPartOfConversation = await conversationHasUser(username, conversationID);

	if (!doesExist || !isUserPartOfConversation && !isCommunity(conversationID)) {
		return false;
	}

	return true;
}

function handleConnections(_io) {
	io = _io;

	io.on('connection', function(socket) {
		socket.on('joined', async function(conversationID){
			var validSession = await validateSocket(socket);

			if (!validSession) {
				return;
			}

			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!conversationID) {
				return;
			}

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			if (!users[username]) {
				users[username] =  1;
			} else {
				users[username]++;
			}

			console.log(users);

			socket.join(username);

			loadRecentMessages(socket, username, 0).then(connectToRoom(socket, username, conversationID));	
		});

		socket.on('update-online-users', async function(conversationID){
			if (!conversationID) {
				return;
			}

			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			updateOnlineUsers(socket, username, conversationID);
		});

		socket.on('input-received', async function(message){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!message || !message.content || !message.temporaryID || !message.conversationID) {
				return;
			}

			const {content, conversationID, temporaryID} = message;

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			storeMessage(socket, username, content, conversationID, temporaryID);
		});

		socket.on('message-removed', async function(message){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!message || !message.messageID || !message.conversationID) {
				return;
			}

			const {messageID, conversationID} = message;

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			removeMessage(username, messageID, conversationID);

			io.sockets.in(conversationID).emit('delete-message', messageID);
		});

		socket.on('disconnect', function(){
			const conversationID = socket.conversationID;
			const username = socket.username;
			var isRoomCommunity;

			if (!rooms[conversationID]) {
				return;
			}

			isRoomCommunity = isCommunity(conversationID);

			if (!isRoomCommunity) {
				disconnectFromRoom(socket, conversationID);
			}

			if (users[username] <= 1) {
				const onlineUsers = rooms[communityConversationID].onlineUsers;
				const connectedUsers = rooms[communityConversationID].connectedUsers;
				const index = connectedUsers.indexOf(socket);

				if (index !== -1) {
					connectedUsers.splice(index, 1);
				}

				onlineUsers.delete(username);

				io.sockets.in(communityConversationID).emit('disconnect-user', username);
				console.log(`${username} has disconnected from ROOM ${communityConversationID}`);
			} else if (isRoomCommunity) {
				const connectedUsers = rooms[conversationID].connectedUsers;
				const index = connectedUsers.indexOf(socket);

				if (index !== -1) {
					connectedUsers.splice(index, 1);
				}
			}

			delete recentMessagesCache[username];

			socket.disconnect();
			users[username]--;

			console.log(users);
		});


		socket.on('fetch-recent-messages', async function(loaded){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);

			loadRecentMessages(socket, username, loaded);
		});

		socket.on('fetch-messages', async function(obj) {
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!obj || !obj.messagesLoaded || !obj.conversationID) {
				return;
			}

			const {messagesLoaded, conversationID} = obj;

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			fetchMessages(socket, messagesLoaded, conversationID, false);
		});

		socket.on('request-private-chat', async function(obj){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!obj || !obj.users || !obj.conversationID) {
				return;
			}

			const {users, conversationID} = obj;

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			var privateConversationID = await findPrivateConversation(users[0], users[1]);

			if (!privateConversationID) {
				privateConversationID = await createPrivateConversation(users);
			}

			changeRoom(socket, username, conversationID, privateConversationID);
		});

		socket.on('request-community', async function(conversationID){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!conversationID) {
				return;
			}

			validConversation = await validateConversation(username, conversationID);

			if (!validConversation) {
				return;
			}

			changeRoom(socket, username, conversationID, communityConversationID);
		});

		socket.on('change-room', async function(obj){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var validConversation;

			if (!obj || !obj.oldConversationID || !obj.newConversationID) {
				return;
			}

			const {oldConversationID, newConversationID, search} = obj;

			validConversation = await validateConversation(username, oldConversationID);

			if (!validConversation) {
				return;
			}

			validConversation = await validateConversation(username, newConversationID);

			if (!newConversationID) {
				return;
			}

			changeRoom(socket, username, oldConversationID, newConversationID, search);
		});

		socket.on('reset-query', function(){
			if (searchResultsCache[socket.id]) {
				searchResultsCache[socket.id] = null;
			}
		});

		socket.on('search-query', async function(obj){
			const userID = socket.request.session.passport.user;
			const username = await getUsername(userID);
			var results;

			if (!obj) {
				return;
			}

			var {query, users, resultsLoaded} = obj;

			if (!query) {
				return;
			} 

			query = query.trim();

			if (!query.length) {
				return;
			}

			if (searchResultsCache[socket.id] && resultsLoaded) {
				let data = searchResultsCache[socket.id].data;
				let res = data.slice(resultsLoaded, resultsLoaded + 7);
				socket.emit('query-results', {users: users, results: res, addLoadAnimation: resultsLoaded + 7 < data.length});
				return;
			}

			if (users) {
				results = await queryUsers(query, username, 0);
			} else {
				results = await queryMessages(query, username, 0);
			}

			if (results.length && !resultsLoaded) {
				searchResultsCache[socket.id] = {
					query: query,
					data: results
				};
			}

			socket.emit('query-results', {users: users, results: results.slice(0, 7), addLoadAnimation: results.length >= 8});
		});
	});
}

module.exports = {
	handleConnections: handleConnections,
	conversationHasUser: conversationHasUser,
	conversationExists: conversationExists,
	isValidConversationID: isValidObjectID,
	isCommunity: isCommunity
}



const express = require('express');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const path = require('path');

const conversationExists = require('../socket.js').conversationExists;
const conversationHasUser = require('../socket.js').conversationHasUser;
const isValidConversationID = require('../socket.js').isValidConversationID;
const isCommunity = require('../socket.js').isCommunity;

const router = express.Router();

const User = require('../models/User');
const Conversation = require('../models/Conversation');

const initializePassport = require('../config/passport');
initializePassport(passport);

const communityConversationID = '5ef3e40a1371e55c7cd1dc94';

async function validate(username, conversationID) {
	if (isCommunity(conversationID)) {
		return true;
	}

	if (!isValidConversationID(conversationID)) {
		return false;
	}

	var exists = await conversationExists(conversationID);

	if (!exists) {
		return false;
	} else {
		return await conversationHasUser(username, conversationID);
	}
}

async function handleValidation(req, res, next) {
	var validated = await validate(req.user.username, req.params.conversationID);

	if (!validated) {
		res.status(404).sendFile('error.html', {root: path.join(__dirname, '../views')});
	} else {
		return next();
	}
}

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.redirect('/login');
}

function forwardAuthenticated(req, res, next) {
	if (!req.isAuthenticated()) {
		return next();
	} 

	res.redirect('/room');
};

function setCookie(name, value, res) {
	res.cookie(name, value, {maxAge: 48 * 60 * 60 * 1000, httpOnly: true});
}

function setNewUserCookie(req, res) {
	setCookie('newauth', req.body.username, res);
}

function setSignupCookie(req, res) {
	setCookie('signup', req.body.username, res);
}

function setLoginCookie(req, res, next) {
	setCookie('login', req.body.username, res);

	return next();
}

router.get('/', (req, res) => {
	res.redirect('/login');
});

router.get('/login', forwardAuthenticated, (req, res) => {
	res.render('login', {
		usernameError: req.flash('username'),
		passwordError: req.flash('password'),
		successMessage: req.flash('success'),
		enteredUsername: req.cookies.newauth || req.cookies.login 
	});
});

router.get('/signup', (req, res) => {
	var signupCookie = req.cookies.signup;
	res.clearCookie('signup');

	res.render('signup', {
		usernameError: req.flash('username'),
		enteredUsername: signupCookie
	});
	
});

router.get('/room/:conversationID', ensureAuthenticated, handleValidation, (req, res) => {
	res.clearCookie('newauth');
	res.render('room', {username: req.user.username, roomName: 'Community'});
});

router.get('/room', (req, res) => {
	res.redirect('/room/' + communityConversationID);
});

router.get('/logout', (req, res) => {
	req.logout();
	res.redirect('/login')
});

router.post('/login', setLoginCookie, passport.authenticate('local', {
	successRedirect : '/room',
	failureRedirect: '/login',
	failureFlash : true,
}));

router.post('/signup', (req, res) => {
	username = req.body.username.toLowerCase();
	password = req.body.password;

	User.findOne({username : username}, function(err, usr){
		if (err) {
			res.redirect('/signup');
			console.log(err);
			return;
		}

		if (usr) {
			setSignupCookie(req, res);
			req.flash('username', 'Username already exists');

			req.session.save(function(err){
				res.redirect('/signup');
			});

			return;
		}

		bcrypt.genSalt(10, function(err, salt) {
			if (err) {
				res.redirect('/login');
				console.log(err);
				return;
			}

			bcrypt.hash(password, salt, function(err, hash) {
				if (err) {
					res.redirect('/login');
					console.log(err);
					return;
				}

				newUser = new User( {
					username : username,
					password : hash,
					conversations: [],
					unseenMessages: []
				});

				newUser.save();

				setNewUserCookie(req, res);
				req.flash('success', 'Successfully created account!');

				req.session.save(function(err){
					res.redirect('/login');
				});
			});
		});	
	});
	
});

module.exports = router;


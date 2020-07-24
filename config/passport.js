const localStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');

const User = require('../models/User');

function initialize(passport) {
	const authenticateUser = (req, username, password, done) => {
		 User.findOne({username : username.toLowerCase()}, async function(err, user) {
			if (err) {
				console.log(err);
				return null;
			}

			if (!user) {
				req.flash('username', 'User does not exist');

				return req.session.save(function(err){
					return done(null, false);
				});
			}

			try{
				if (await bcrypt.compare(password, user.password)) {
					return done(null, user);

				} else {
					req.flash('password', 'Password is incorrect');

					return req.session.save(function(err){
						return done(null, false);
					});
				}

			} catch (error) {
				return done(error);
			}

		});
	}

	passport.use(new localStrategy({ usernameField : 'username', passReqToCallback: true}, authenticateUser));

	passport.serializeUser(function(user, done){
		done(null, user.id);
	});
	passport.deserializeUser(function(id, done){
		User.findById(id, function(err, user){
			if (err) {
				console.log(err);
			}

			done(err, user);
		});
	});	
}

module.exports = initialize;
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const cookieParser = require('cookie-parser')
const path = require('path');
const flash = require('connect-flash');
const express = require('express');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const compression = require('compression');
const cors = require('cors')
const keys = require('./config/keys');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

require('./socket.js').handleConnections(io);

const router = require('./routes/index');

const PORT = process.env.PORT || 5000;

// Connect to the database
mongoose.connect(process.env.CONNECTION_STRING, {
 useNewUrlParser : true,
 useUnifiedTopology: true })
	.then(() => console.log('Mongodb connected!'))
	.catch((error) => console.log(error));

app.use(cors());

// Views
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');


// Layouts
app.use(expressLayouts);
app.use(express.urlencoded({ extended: false}));
app.use(express.static(path.join(__dirname, '/public')));

app.use(cookieParser());
app.use(compression());
app.use(flash());

sessionMiddleware = session({
    store: new MongoStore({
        url: process.env.CONNECTION_STRING
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

io.use(function(socket, next){
 	sessionMiddleware(socket.request, {}, next);
 })

// Routes
app.use('/', router);

app.use(function (req, res) {
    res.status(405).sendFile('error.html', {root: path.join(__dirname, 'views')});
    res.status(404).sendFile('error.html', {root: path.join(__dirname, 'views')});
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}...`));

module.exports = app;
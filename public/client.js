if(typeof String.prototype.trim !== 'function') {
  String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, ''); 
  }
}

const socket = io.connect(window.location.host);

const chatContainer = document.querySelector('.chat');
const onlineUsersContainer = document.querySelector('.users');
const inputField = document.getElementById('user-input');

const currentUsername = document.getElementById('username').innerText.trim();

const TEXTFIELD_HEIGHT = 29;

var numberOfRecentMessagesLoaded = 0;
var numberOfSearchResultsLoaded = 0;
var numberOfMessagesLoaded = 0;
var numberOfUsersOnline = 0;

var idleScrollState = false;
var scrollAnimation = false;
var scrollBottomAnimation = false;
var scrollDisabled = false;

var activeElement = document;

$(document).ready(function() {
	$('body *').on('touchstart', function (){});

	$(document).on('click touchend', '.x-icon', function(e){	
		$('.search-icon-container .fa').attr('class', 'fa fa-search');
		$('#search').val('');
		$('.search-dropdown .spinner-container').remove();	

		deleteSearchTag();
	});

	$(document).on('click touchend', '.redirect-container', function(){
		$('.redirect-icon').tooltip('hide');
		$('.redirect-container').hide();
		requestCommunity();
	});

	$(window).on('resize', function(){
		resize();
		updateNavbar();
	});


	$(document).keydown((e) => arrowKeyScroll(e));

	$(document).on('click touchend', function(e){
		activeElement = e.target;
	});


	/* touch events */

	if(!('ontouchstart' in window)) {
  		$('[data-toggle="tooltip"]').tooltip();
	}



	$('.search-option').on('touchstart', function() {
		$(this).addClass('search-option-hover');
	});

	$('.search-option').on('touchend', function() {
		$(this).removeClass('search-option-hover');
	});




	$('.search-minimize .fa-search').on('touchstart', function() {
		$(this).addClass('fa-search-hover');
	});

	$('.search-minimize .fa-search').on('touchend', function() {
		$(this).removeClass('fa-search-hover');
	});



	$('#no-private-messages').on('touchstart', function() {
		$(this).addClass('no-private-messages-hover');
	});

	$('#no-private-messages').on('touchend', function() {
		$(this).removeClass('no-private-messages-hover');
	});



	$('.nav-container').on('touchstart', function() {
		$('.nav-message-icon').addClass('nav-message-icon-hover');
	});

	$('.nav-container').on('touchend', function() {
		$('nav-message-icon').removeClass('nav-message-icon-hover');
	});



	$('.nav-link').on('touchstart', function() {
		$(this).addClass('nav-link-hover');
	});

	$('.nav-link').on('touchend', function() {
		$(this).removeClass('nav-link-hover');
	});



	$('#send-message').on('touchstart', function() {
		$('#send-message').addClass('send-message-hover');
	});

	$('#send-message').on('touchend', function() {
		$('#send-message').removeClass('send-message-hover');
	});



	$('.scroll-bottom .fa').on('touchstart', function() {
		$(this).addClass('fa-hover');
	});

	$('.scroll-bottom .fa').on('touchend', function() {
		$(this).removeClass('fa-hover');
	});



	$('.message').on('touchstart', function() {
		$(this).addClass('message-hover');
	});

	$('.message').on('touchend', function() {
		$(this).removeClass('message-hover');
	});



	$('.delete-button').on('touchstart', function() {
		$(this).addClass('delete-button-hover');
	});

	$('.delete-button').on('touchend', function() {
		$(this).removeClass('delete-button-hover');
	});



	$('.online-user').on('touchstart', function() {
		$(this).addClass('online-user-hover');
	});

	$('.online-user').on('touchend', function() {
		$(this).removeClass('online-user-hover');
	});



	$('.redirect-icon').on('touchstart', function() {
		$(this).addClass('redirect-icon-hover');
	});

	$('.redirect-icon').on('touchend', function() {
		$(this).removeClass('redirect-icon-hover');
	});



	$('.scroll-bottom .fa').on('click touchend', function(){
		scrollBottomAnimation = true;

		$('.scroll-bottom').fadeOut(500);

		$(chatContainer).animate({ scrollTop: chatContainer.scrollHeight}, 800, function() {
			scrollBottomAnimation = false;
			enableScroll();
		});
	});

	$('.nav-container').on('click touchend', function(){
		$('.dropdown-item').removeClass('selected');
	});
	
	$('#user-input').on('input', resize);

	$('#user-input').keydown(function(e){	
		if (e.key === 'Enter') {
			sendMessage();

			if(e.preventDefault) {
				e.preventDefault();
			}

			return false; 
		}
	});

	$('.d-menu').scroll(function(){
		if (isScrollBottom(this)) {
			if (!$(this).find('.spinner-container:visible').exists()) {
				$(this).find('.spinner-container').show();
			}
			
			loadMoreDataDropdown.call(this);
		}
	});

	$('.chat').scroll(function(e){
		if (scrollAnimation || scrollBottomAnimation) {
			disableScroll();
		}

		if (chatContainer.scrollTop === 0 && isScrollable(chatContainer)) {
			$(this).find('.spinner-container').show();
			loadMoreMessages();
		}

		if (chatContainer.scrollHeight - chatContainer.scrollTop > 2500 && !scrollBottomAnimation) {
			$('.scroll-bottom').fadeIn(500);
		} else if (chatContainer.scrollHeight - chatContainer.scrollTop <= 2500) {
			$('.scroll-bottom').fadeOut(500);
		}

		if (!isScrollBottom(this)) {
			idleScrollState = true;
		} else if (idleScrollState) {
			idleScrollState = false;
		}

	});

	$('#send-message').on('click touchend', sendMessage);

	$('.navbar-toggler').on('click touchend', function(){
		if (!$(this).hasClass('collapsed')) {
			$('.navbar').css({'min-height':  ''});
		}
	});

	$('.search-minimize').on('click touchend', searchMinimized);

	$('.search-option').on('click touchend', function(){
		if ($(this).hasClass('so1')) {
			addSearchTag(1);	
		} else {
			addSearchTag(2);
		}
	});

	$('#search').keydown(function(e){
		if (e.keyCode === 8) {
			var caretPos = getCaretPosition($(this)[0]);

			if (!caretPos && $('.search-tag').is(':visible')) {
				deleteSearchTag();
			}
		}
	});

	$('#search').on('focus blur', function(e){
		if (e.type === 'focus') {
			$(this).css({'border-color': '#FFB6C1'});
			$('.search-icon-container').css({'border-color': '#FFB6C1'});
		} else {
			$(this).css({'border-color': 'white'});
			$('.search-icon-container').css({'border-color': 'white'});
		}

		if (e.type === 'focus' && ($('.search-dropdown .dropdown-item').exists() && $(this).val().length || !$('.search-tag').is(':visible') && !$(this).val().length)) {
			$('.search-wrapper').show();
		} else if (e.type === 'blur') {
			$('.search-wrapper').hide();
			$('.selected').removeClass('selected');

			if (!$(this).val().length && !$('.search-tag').is(':visible')) {
				$(this).attr('placeholder', 'Search');
			}
		}
	});

	$('#search').on('input', function(e){
		if ($('.search-dropdown .spinner-container').is(':visible')) {
			$('.search-dropdown').scrollTop(0);
			$('.search-dropdown .spinner-container').hide();
		}

		searchQuery();

		var value = $(this).val();

		value = $(this).val().toLowerCase();

		if (!value.length) {
			$('.search-icon-container .fa').attr('class', 'fa fa-search');

			if ($('.search-tag').is(':visible')) {
				$('.search-wrapper').hide();
			} else {
				$(this).attr('placeholder', 'Search');

				$('.search-options').show();
				$('.search-wrapper').show();
			}

		} else {
			if (value.slice(0, 6) === 'users:' && !$('.search-tag').is(':visible')) {
				$('#search').val(value.slice(6));
				addSearchTag(1);
			} else if (value.slice(0, 9) === 'messages:' && !$('.search-tag').is(':visible')) {
				$('#search').val(value.slice(9));
				addSearchTag(2);
			}
		}

		if ($('.search-tag').is(':visible') || value.length) {
				$('.search-icon-container .fa').attr('class', 'fa x-icon');
		}

	});

	$('.search-dropdown').mousedown(function(e){
		e.preventDefault();
	});

	$('.search-icon-container .fa').mousedown(function(e){
		e.preventDefault();
	});

	$('.search-icon-container .fa').mouseup(function(e){
		$('#search').focus();
	});
});


function disableScroll() {
	chatContainer.style.overflow = 'hidden';
	scrollDisabled = true;
}

function enableScroll() {
	chatContainer.style.overflow = null;
	scrollDisabled = false;
}

function arrowKeyScroll(e) {
	if (e.which === 40 || e.which === 38) {
		e.preventDefault();

		var element = getActiveScrollableElement();

		if (!element) {
			return;
		}

		var scrollDiff = 25;
		var newScrollTop = element.scrollTop();
			
		if (e.which === 40) {
			newScrollTop += scrollDiff;
		} else {
			newScrollTop -= scrollDiff;
		}

		element.scrollTop(newScrollTop);
	}
}

function isScrollBottom(element) {
	return element.scrollTop + element.clientHeight === element.scrollHeight
}

function getActiveScrollableElement() {
	var elem = $('.d-menu:visible');

	if (elem[0]) {
		return elem;
	}

	if (activeElement === chatContainer || activeElement === onlineUsersContainer) {
		return $(activeElement);
	} else if ($(activeElement).parents('.users').length) {
		return $(onlineUsersContainer);
	} else if ($(activeElement).parents('.chat').length) {
		return $(chatContainer);	
	} else {
		return $(document);
	}
} 

function addSearchTag(type) {
	var padding;

	if (type === 1) {
		$('.st1').show();
		padding = 54;
	} else {
		$('.st2').show();
		padding = 87;
	}

	$('.search-wrapper').hide();

	$('#search').css({'padding-left': padding + 'px'});
	$('#search').removeAttr('placeholder');
	$('#search').trigger('input');
	$('#search').get(0).setSelectionRange(0,0);
}


function deleteSearchTag() {
	var value = $('#search').val();

	$('.search-dropdown .spinner-container').remove();
	$('.search-dropdown .dropdown-item').remove();
	$('.search-tag').hide();
	$('#search').val(value.replace(/^\s+|\s+$/g,""));
	$('#search').css({'padding-left': '8px'});
	$('#search').trigger('input');
	$('#search').trigger('focus');
}


function hoverDropdown() {
	let flag = false;

	if ($(this).hasClass('selected')) {
		flag = true;
	}

	$('.dropdown-item').removeClass('selected');

	if (flag) {
		$(this).addClass('selected');
	}

	$(this).toggleClass('selected');
}


function getCaretPosition (oField) {
  var iCaretPos = 0;

  if (document.selection) {

    oField.trigger('focus');

    var oSel = document.selection.createRange();

    oSel.moveStart('character', -oField.value.length);

    iCaretPos = oSel.text.length;
  }

  else if (oField.selectionStart || oField.selectionStart == '0')
    iCaretPos = oField.selectionDirection=='backward' ? oField.selectionStart : oField.selectionEnd;

  return iCaretPos;
}




function updateNavbar() {
	let win = $(this);

	if (win.width() > 575) {
		$('#username').show();
		$('.nav-item').show();

		$('.search-minimize').hide();
		$('.navbar-toggler').hide();

		$('.cancel-search').remove();

		$('.navbar').css({'min-height': ''});
	} else if (!$('.navbar').hasClass('collapsed-search')) {

		$('.navbar-toggler').show();

		$('.search-minimize').show();
		$('.search-container').hide();			
	} else {
		searchMinimized();
	}

	chatContainer.scrollTop = chatContainer.scrollHeight;
}

function cancelSearch() {
	$('.cancel-search').remove();

	$('li').show();
	
	$('#username').show();
	$('.navbar-toggler').show();

	$('.search-container').hide();

	$('.navbar').removeClass('collapsed-search');
}

function searchMinimized() {
	if ($('.dropdown-menu').hasClass('show')) {
		$('.nav-container').click();
	}

	let height = $('.navbar').outerHeight();

	$('#username').hide();
	$('.nav-item').hide();
	$('.navbar-toggler').hide();

	$('.search-container').show();

	if (!$('.cancel-search').exists()) {
		let cancel = document.createElement('a');
		cancel.className = 'cancel-search';
		cancel.innerHTML = 'Cancel';

		$(cancel).on('click touchend', cancelSearch);

		$('#search-bar').append(cancel);
	}

	$('.navbar').addClass('collapsed-search');

	$('#search').focus();
	$('.navbar').css({'min-height': height + 'px'});
}





socket.on('connect', function(data){
	var username = currentUsername;
	var conversationID = getConversationID();

	if (!$('.message').exists()) {
		resetRoom();
		socket.emit('joined', conversationID);
	} else {
		socket.emit('update-online-users', conversationID);
	}
});

socket.on('set-placeholder', function({text}){
	setPlaceholderText(text);
});

socket.on('send-message', function({_id, senderName, content, temporaryID}){
	appendMessage(senderName, content, _id, temporaryID, getDateOfMessage(_id), false);
});

socket.on('disconnect-user', function(username){
	deleteUser(username);
});

socket.on('delete-message', function(id){
	deleteMessage(id);
});

socket.on('add-user', function(username){
	appendUser(username);
});

socket.on('load-users', function({users}){
	adjustOnlineUsersContainerHeight();

	if (!$('.online-user').exists()) {
		loadUsers(users);
	}
});

socket.on('load-messages', function({messages, addLoadAnimation, search}){
	if (!$('.message').exists()) {
		prependMessages(messages, addLoadAnimation);
	}

	initialChatLoad();

	if (search) {
		scrollToMessage(search.searchMessageID);
	}
});

socket.on('load-fetched-messages', function({messages, addLoadAnimation, search}){
	const prevScrollHeight = chatContainer.scrollHeight;

	prependMessages(messages, addLoadAnimation);

	if (search) {
		scrollToMessage(search.searchMessageID);
	} else {
		chatContainer.scrollTop += (chatContainer.scrollHeight - prevScrollHeight);	
	}
});

socket.on('load-recent-messages', function({messages, addLoadAnimation}){
	$('.dropdown-menu .spinner-container').remove();

	if (!messages.length) {
		if (!numberOfRecentMessagesLoaded) {
			addNoMessagesFound($('.dropdown-menu')[0]);
		}
		return;
	}

	if (numberOfRecentMessagesLoaded) {
		$('.dropdown-menu .dropdown-item').last().css({'border-bottom': '1px solid rgba(255, 255, 255, 0.3)'});
	}

	loadRecentMessages(messages);

	if (addLoadAnimation) {
		loadSpinner($('.dropdown-menu')[0]);
	}

	$('.dropdown-menu .dropdown-item').last().css({'border-bottom': 'none'});
});

socket.on('update-unseen-message-count', function(value){
	if (value > 99) {
		value = 99;
	} 

	updateUnseenMessages(value);
});

socket.on('add-recent-message', function({title, content, conversationID, messageID, unseen}){
	var id = messageID || conversationID;
	var date = getDateOfMessage(id);

	addRecentMessage(conversationID, title, content, date, unseen, true);

	$('.dropdown-menu .dropdown-item').last().css({'border-bottom': 'none'});
});

socket.on('remove-recent-message', function({title, content, conversationID, messageID, unseen}){
	var id = messageID || conversationID;
	var date = getDateOfMessage(id);

	removeRecentMessage(conversationID, title, content, date, unseen);
});

socket.on('delete-messages', function() {
	clearAllMessages();
});

socket.on('seen-message', function(conversationID) {
	seenMessage(conversationID);
});

socket.on('prepare-room-change', function({conversationID, redirect}){
	changeURL(conversationID);
	resetRoom();

	if (redirect) {
		$('.redirect-container').show();
	}
});

socket.on('query-results', function({users, results, addLoadAnimation}){
	if (!$('#search').val().length && $('.search-tag:visible').exists()) {
		return;
	}
	
	$('.search-dropdown .spinner-container').remove();

	if (!numberOfSearchResultsLoaded) {
		$('.search-dropdown .dropdown-item').remove();
	} else {
		$('.search-dropdown .dropdown-item').last().css({'border-bottom': '1px solid rgba(255, 255, 255, 0.3)'});
	}

	if (results.length) {
		$('.search-options').hide();
		$('.search-wrapper').show();
	}

	if (users) {
		loadSearchUsers(results);
	} else {
		loadSearchMessages(results);
	}

	if (addLoadAnimation) {
		loadSpinner($('.search-dropdown')[0]);
	}

	numberOfSearchResultsLoaded += results.length;

	$('.search-dropdown .dropdown-item').last().css({'border-bottom': 'none'});
});

socket.on('logout', function(){
	window.location.href = '/logout';
});












/* Date */

function getDateOfMessage(id) {
	const date = getTimestamp(id);
	return parseDate(date);
}

function parseDate(date) {
	if (isLessThanOneDayOld(date)) {
		return getTime(date);
	} else if (getDaysElapsed(date) <= 7) {
		return getDayAndTime(date);
	} else {
		return getFullDate(date); 
	}
}

function getDayAndTime(date) {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const day = days[date.getDay()];
	const time = getTime(date);

	return `${day}, ${time}`;
}

function getDaysElapsed(date) {
	const today = new Date();
	const ONE_DAY = 1000 * 60 * 60 * 24;
	return Math.ceil((today.getTime() - date.getTime()) / ONE_DAY);
}

function isLessThanOneDayOld(date) {
	return getDaysElapsed(date) === 1; 
}

function getTime(date) {
	var minutes = date.getMinutes();
	var hours = date.getHours();
	var extension = 'am';

	if (minutes < 10) {
		minutes = '0' + minutes;
	}

	if (hours >= 12) {
		extension = 'pm';
	}

	if (hours % 12 === 0) {
		hours = 12;
	} else {
		hours %= 12;
	}

	return `${hours}:${minutes}${extension}`;
}

function getFullDate(date) {
	var year = date.getFullYear();
	var day = date.getDate();
	var month = date.getMonth();

	year %= (Math.floor(year / 1000) * 1000);

	if (day < 10) {
		day = '0' + day;
	}

	if (month < 10) {
		month = '0' + month;
	}

	return `${month}/${day}/${year}`;
}

function getTimestamp(id) {
	var timestamp = id.toString().slice(0,8);
	return new Date(parseInt(timestamp, 16) * 1000);
}







/* Creating Elements */

function addNoMessagesFound(element) {
	if (!$('.no-messages').exists()) {
		const container = createNoMessagesFound();

		element.append(container);
	} 
}
function createNoMessagesFound() {
	const container = document.createElement('div');

	container.className = 'no-messages';
	container.innerHTML = 'You have no messages';

	return container;
}

function createRecentMessage(conversationID, title, content, date, unseen) {
	const recentMessageContainer = document.createElement('div');
	const leftContainer = document.createElement('div');
	const messageTitle = document.createElement('div');
	const messageContent = document.createElement('p');

	const rightContainer = document.createElement('div');
	const messageDate = document.createElement('div');
	const unseenMessages = document.createElement('div');

	$(recentMessageContainer).on('click', () => changeRoom.call(recentMessageContainer, recentMessageContainer.id));

	$(recentMessageContainer).hover(hoverDropdown);

	recentMessageContainer.className = 'dropdown-item';
	recentMessageContainer.id = conversationID;

	leftContainer.className = 'left-container';

	messageTitle.className = 'recent-message-title ellipses';
	messageTitle.innerHTML = title;

	messageContent.className = 'recent-message-content ellipses';
	messageContent.innerHTML = content;

	leftContainer.append(messageTitle);
	leftContainer.append(messageContent);

	rightContainer.className = 'right-container';

	messageDate.className = 'recent-message-date';
	messageDate.innerHTML = date;

	rightContainer.append(messageDate);

	if (unseen) {
		$(recentMessageContainer).addClass('unseen');

		unseenMessages.className = 'unseen-messages inner';
		unseenMessages.innerHTML = unseen;

		rightContainer.append(unseenMessages);
	}

	recentMessageContainer.append(leftContainer);
	recentMessageContainer.append(rightContainer);

	return recentMessageContainer;
}

function loadSpinner(element) {
	const spinner = createSpinner();
	$(spinner).hide();

	if (element === chatContainer) {
		element.prepend(spinner);
	} else {
		element.append(spinner);
	}
}


function loadSearchMessages(messages) {
	messages.forEach(function({title, content, conversationID, messageID, unseen}){
		let id = messageID || conversationID;
		let date = getDateOfMessage(id);

		const recentMessage = createRecentMessage(conversationID, title, content, date, unseen);
		$(recentMessage).addClass('search-message');
		$(recentMessage).attr('data-conversationID', conversationID);
		$(recentMessage).attr('data-messageID', messageID);
		$(recentMessage).removeAttr('id');

		$(recentMessage).unbind('click').bind('click', () => {
			if ($('#' + messageID).exists()) {
				scrollToMessage(messageID);
			} else {
				changeRoom.call(recentMessage, $(recentMessage).data('conversationid'), {searchMessageID: messageID, messagesLoaded: numberOfMessagesLoaded});
			}

			cancelSearch();
			$('.navbar-toggler').click();
		});

		if (!$('*[data-messageID="' + messageID + '"]').exists()) {
			$('.search-dropdown').append(recentMessage);
		} else {
			console.log('tried adding duplicate');
		}
	});		
}

function loadSearchUsers(users) {
	users.forEach(function(username){
		const user = createSearchUser(username);

		$('.search-dropdown').prepend(user);
	});
}

function createSearchUser(username) {
	const container = document.createElement('div');

	container.className = 'dropdown-item search-user';
	container.innerHTML = username;

	$(container).on('click touchend', function(){
		requestPrivateChat(username);
		$('#search').blur();

		cancelSearch();
		$('.navbar-toggler').click();
	});

	$(container).hover(hoverDropdown);

	return container;
}

function createSpinner() {
	const spinnerContainer = document.createElement('div');
	const spinner = document.createElement('div');
	const rect1 = document.createElement('div');
	const rect2 = document.createElement('div');
	const rect3 = document.createElement('div');
	const rect4 = document.createElement('div');

	spinner.className = "spinner";

	spinnerContainer.className = "spinner-container";

	rect1.className =  "rect1"
	rect2.className = "rect2";
	rect3.className = "rect3";
	rect4.className = "rect4";

	spinner.append(rect1);
	spinner.append(rect2);
	spinner.append(rect3);
	spinner.append(rect4);

	spinnerContainer.append(spinner);

	return spinnerContainer;
}


function createMessage(username, msg, id, date, pending) {
	const messageContainer = document.createElement('div');
	const contentContainer = document.createElement('div');
	const userContainer = document.createElement('div');
	const dateContainer = document.createElement('div');

	const message = document.createElement('div');
	const user = document.createElement('h7');
	const messageContent = document.createElement('p');
	const dateContent = document.createElement('small');

	messageContainer.className = "message-container other";	
	messageContainer.id = id;

	message.className = "message";

	contentContainer.className = 'message-content-container';

	user.className = "user ellipses";
	userContainer.className = "user-header";
	user.innerText = username;
	userContainer.append(user);
	contentContainer.append(userContainer);

	messageContent.className = "message-content";
	messageContent.innerText = msg;
	contentContainer.append(messageContent);
	message.append(contentContainer);

	dateContainer.className = 'date-container';
	dateContent.className = 'date';
	dateContainer.append(dateContent);

	if (!pending) {
		dateContent.append(date);
	}

	message.append(dateContainer);

	messageContainer.append(message);

	if (username === currentUsername) {
		messageContainer.className = 'message-container self'

		let deleteButton = createDeleteButton();

		if (pending) {
			$(deleteButton).find('.delete-button').prop('disabled', true);
		}

		message.prepend(deleteButton);
		
	}

	return messageContainer;
}

function createDeleteButton() {
	const buttonContainer = document.createElement('div');
	const button = document.createElement('button');
	const conversationID = getConversationID();

	buttonContainer.className = 'delete-header';
	buttonContainer.append(button);

	button.className = "delete-button";
	button.innerText = "Delete";

	$(button).on('click touchend', function(e){
		socket.emit('message-removed', {
			messageID: $(e.target).closest('.message-container').attr('id'),
			conversationID: conversationID
		});
	});

	return buttonContainer;
}

function createUser(username) {
	const onlineUserContainer = document.createElement('div');
	const onlineUser = document.createElement('div');

	onlineUserContainer.className = 'online-user-container';
	onlineUserContainer.id = username;

	onlineUser.className = 'online-user ellipses';
	onlineUser.innerText = username;
	onlineUserContainer.append(onlineUser);

	if (username !== currentUsername) {
		$(onlineUserContainer).css('cursor', 'pointer');

		$(onlineUserContainer).on('click touchend', function(){
			requestPrivateChat(username);
		});
	}

	numberOfUsersOnline++;

	return onlineUserContainer;
}











/* Message Functions */


function sendMessage() {
	if (inputField.value.trim().length == 0) {
		clearInput();
		return;
	}

	const conversationID = getConversationID();
	const message = inputField.value;
	const temporaryID = getPendingID();

	socket.emit('input-received', 
	{
		content: message,
		conversationID: conversationID,
		temporaryID: temporaryID
	});

	appendPendingMessage(currentUsername, message, temporaryID);

	clearInput();
}

function prependMessages(messages, addLoadAnimation) {
	if (messages.length == 0) {
		if ($('.chat .spinner-container').exists()) {
			$('.chat .spinner-container').remove();
		}
		return;
	}

	$('.chat .spinner-container').remove();

	messages.forEach(function(message){
		appendMessage(message.senderName, message.content, message._id, null, getDateOfMessage(message._id), true);
	});

	if (addLoadAnimation) {
		loadSpinner(chatContainer);
	}
}

function appendPendingMessage(username, msg, id) {
	const messageContainer = createMessage(username, msg, id, null, true);
	$(messageContainer).css({opacity: 0.4});

	chatContainer.append(messageContainer);
	chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateMessage(username, msg, id, temporaryID, date) {
	var pendingMessage = $('#' + temporaryID);

	if (pendingMessage.exists()) {
		$(pendingMessage).find('.delete-button').prop('disabled', false);

		pendingMessage.find('.user').html(username);
		pendingMessage.find('.message-content').html(msg);
		pendingMessage.attr('id', id);
		pendingMessage.find('.date').html(date);

		pendingMessage.animate({opacity: 1}, 250);
	}
}

function appendMessage(username, msg, id, temporaryID, date, prepend) {
	if (temporaryID) {
		updateMessage(username, msg, id, temporaryID, date);
	} else {
		const messageContainer = createMessage(username, msg, id, date, false);

		if (prepend) {
			chatContainer.prepend(messageContainer);
		} else {
			chatContainer.append(messageContainer);

			if (!idleScrollState) {	
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}
	}

	numberOfMessagesLoaded++;
}

function deleteMessage(id) {
	if ($('#' + id).exists()) {
		$('#' + id).fadeOut(300, function(){
			$('#' + id).remove();
			numberOfMessagesLoaded--;
		});
	}
}













/* Recent Messages */

function updateUnseenMessages(value) {
	var unseenContainer = $('.outter');

	if (unseenContainer.exists()) {
		let prevUnseen = parseInt($('.outter').html(), 10);

		if (!value) {
			$('.outter').remove();
		} else if (prevUnseen !== value) {
			$('.outter').html(value);
		}

	} else if (value) {
		const unseenMessageContainer = document.createElement('div');
		unseenMessageContainer.className = 'unseen-messages outter'; 
		unseenMessageContainer.innerHTML = value;

		$('.m-icons-wrapper').prepend($(unseenMessageContainer));
	}

	updateTitle();
}


function loadRecentMessages(messages) {
	messages.forEach(function(message){
		if (message) {
			const {title, content, conversationID, messageID, unseen} = message;

			let id = messageID || conversationID;
			let date = getDateOfMessage(id);

			addRecentMessage(conversationID, title, content, date, unseen, false);
			
		}
	});
}

function addRecentMessage(conversationID, title, content, date, unseen, prepend) {
	const recentMessage = createRecentMessage(conversationID, title, content, date, unseen);

	if ($('.no-messages').exists()) {
		$('.no-messages').remove();
	}

	if ($('#' + conversationID).exists()) {
		$('#' + conversationID).remove();
	}

	if (prepend) {
		$('.dropdown-menu').prepend(recentMessage);
	} else {
		$('.dropdown-menu').append(recentMessage);
	}

	numberOfRecentMessagesLoaded++;
}

function removeRecentMessage(conversationID, title, content, date, unseen) {
	const recentMessage = $('#' + conversationID);
	var unseenMessages = undefined;

	if (!recentMessage.exists()) {
		return;
	}

	unseenMessages = recentMessage.find('.unseen-messages');

	recentMessage.find('.recent-message-title').html(title);
	recentMessage.find('.recent-message-content').html(content);
	recentMessage.find('.recent-message-date').html(date);

	if (unseenMessages.exists()) {
		if (unseen) {
			unseenMessages.html(unseen);
		} else {
			recentMessage.removeClass('unseen');
			unseenMessages.remove();
		}
	}
}

function seenMessage(conversationID) {
	if ($('#' + conversationID).exists()) {
		$('#' + conversationID).removeClass('unseen');
		$('#' + conversationID).find('.unseen-messages').remove();
	}
}







/* Users */

function loadUsers(users) {
	users.forEach(function(user){
		appendUser(user);
	});
}

function appendUser(username) {
	if (!userExists(username)) {
		let user = createUser(username);
		let flag = false;

		$('.online-user-container').each(function(){
			if (username < $(this).attr('id')) {
				$(user).insertBefore($(this));
				flag = true;
				return;
			}
		});

		if (!flag) {
			onlineUsersContainer.appendChild(user);
		}
	}
}

function deleteUser(username) {
	if ($('#' + username).exists()) {	
		$('#' + username).remove();
		numberOfUsersOnline--;
	}
}

function userExists(username) {
	return $('#' + username).exists();
}












/* input */


function updateTitle() {
	const roomName = $('.room-name').html();
	var text = 'Chatroom | ' + roomName;
	var unseen = '';

	if ($('.outter').exists()) {
		unseen = '(' + parseInt($('.outter').html(), 10) + ') ';
	}

	$('title').html(unseen + text);
}

function setPlaceholderText(text) {
	$('#user-input').attr('placeholder', text);

	var words = text.split(" ");
	$('.room-name').html(words[words.length - 1]);

	updateTitle();
}

function clearInput() {
	inputField.value = "";
	$('.input-fields-container').outerHeight(TEXTFIELD_HEIGHT);
	$('.button-container').outerHeight(TEXTFIELD_HEIGHT);
	$(inputField).outerHeight(TEXTFIELD_HEIGHT);
	$(chatContainer).outerHeight($('.chat-container').outerHeight() - $('.input-fields-container').outerHeight() - $('.room-name').outerHeight() - 2);
}

function getPaddingHeight(element) {
	const computed = window.getComputedStyle(element);

	var height = parseInt(computed.getPropertyValue('padding-top'), 10)
				+ parseInt(computed.getPropertyValue('padding-bottom'), 10);


	return height;
}

function getAdjustedHeight(element) {
	const rawHeight = $(element).height();
	const computed = window.getComputedStyle(element);

	var height = rawHeight + getPaddingHeight(element);

	return height;
}

function isScrollable(element) {
	var height = getAdjustedHeight(element);

	return height != element.scrollHeight && !scrollAnimation && !scrollBottomAnimation;
}

function resize() {
	inputField.value = inputField.value.replace(/(\r\n|\n|\r)/gm, "");
	const prevHeight = $(inputField).outerHeight();

	$(inputField).outerHeight(TEXTFIELD_HEIGHT);

	const inputHeight = inputField.scrollHeight;
	const diff =  inputHeight - prevHeight;


	if (diff > 0) {
		chatContainer.scrollTop += 50;
	}

	$('.input-fields-container').outerHeight(inputHeight);
	$('.button-container').outerHeight(inputHeight);
	$(inputField).outerHeight(inputHeight);


	$(chatContainer).outerHeight($('.chat-container').outerHeight() - $('.input-fields-container').outerHeight() - $('.room-name').outerHeight() - 2);
}









/* Room */

function getConversationID() {
	var pattern = /room\/(.+)/

	match = window.location.href.match(pattern);

	return match[1];
}

function requestPrivateChat(username) {
	const conversationID = getConversationID();

	socket.emit('request-private-chat', {
		users: [currentUsername, username],
		conversationID: conversationID
	});
}

function requestCommunity() {
	const conversationID = getConversationID();

	socket.emit('request-community', conversationID);
}






/* Other */


function changeURL(conversationID) {
	if (history.pushState) {
		var newURL = window.location.protocol + "//" + window.location.host + "/room/" + conversationID;
		window.history.pushState({path:newURL},'', newURL);
	} else {
  		document.location.href = "/room/" + conversationID;
	}
}

function changeRoom(conversationID, search) {
	const current = getConversationID();

	socket.emit('change-room', {oldConversationID: current, newConversationID: conversationID, search: search});	

	if ($(this).hasClass('search-message')) {
		$('#search').blur();
	}
}

function initialChatLoad() {
	if ($('.overlay').exists()) {
		$('.overlay').fadeOut('slow', function(){
			$(this).remove();
		});
	}

	chatContainer.scrollTop = chatContainer.scrollHeight;
		
	$('.overlay').fadeOut('slow', function(){
			$(this).remove();
	});
}

function resetRoom() {
	clearAllOnlineUsers();
	clearAllMessages();
	clearInput();

	$('.redirect-container').hide();
	
}

function clearAllOnlineUsers() {
	$('.users').empty();
	numberOfUsersOnline = 0;
}

function clearAllMessages() {
	$('.chat').empty();
	numberOfMessagesLoaded = 0;
}

function deleteCookie(name, path) {
	document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
}

function getCookie(name) {
 	var match = document.cookie.match(RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
 	return match ? match[1] : null;
}

function getPendingID() {
	var id = generateID();

	while ($('#' + id).exists()) {
		id = generateID();
	}

	return id;
}

function generateID() {
	return '_' + Math.random().toString(36).slice(2, 9);
}

function scrollToMessage(searchMessageID) {
	$('.message').removeClass('search-highlight');

	var curr = chatContainer.scrollTop;
	var to = $('#' + searchMessageID)[0].offsetTop - 125;

	if (Math.abs(curr - to) > 50) {
		scrollAnimation = true;

		$(chatContainer).animate({ scrollTop: to }, 250, function() {
			scrollAnimation = false;
			enableScroll();
		});
	}

	//$('#' + messageID)[0].scrollIntoView({behavior: 'smooth'});

	$('#' + searchMessageID).find('.message').addClass('search-highlight')
}

function smoothScroll(e) {
	var e0 = e.originalEvent,
        delta = e0.wheelDelta || -e0.detail;

    this.scrollTop += ( delta < 0 ? 1 : -1 ) * 30;
    e.preventDefault();
}

function adjustOnlineUsersContainerHeight() {
	var height = $('.online-users').height() - $('h6').outerHeight();


	if ($('.redirect-container').is(':visible')) {
		height -= $('.redirect-container').height();
	}

	$(onlineUsersContainer).css({'max-height': height});
}

function getQuery() {
	query = $('#search').val()

	if (!query || !$('.search-tag').is(':visible')) {
		return null;
	}

	query = query.trim();

	return query.length > 0 ? query : null;
}

function isUserQuery() {
	return !$('.st2').is(':visible');
}


function loadMoreRecentMessages() {
	socket.emit('fetch-recent-messages', numberOfRecentMessagesLoaded);
}

function loadMoreSearchResults() {
	var query = getQuery();
	var userQuery = isUserQuery();

	socket.emit('search-query', {query: query, users: userQuery, resultsLoaded: numberOfSearchResultsLoaded});
}

var loadMoreDataDropdown = debounce(function(){
	if ($(this).hasClass('dropdown-menu')) {
		loadMoreRecentMessages();
	} else {
		loadMoreSearchResults();
	}
}, 300);

var loadMoreMessages = debounce(function(){
	const conversationID = getConversationID();
	socket.emit('fetch-messages', {messagesLoaded : numberOfMessagesLoaded, conversationID : conversationID});
}, 100);

var searchQuery = debounce(function() {
	var query = getQuery();
	var userQuery = isUserQuery();

	numberOfSearchResultsLoaded = 0;

	if (!query) {
		return;
	}

	socket.emit('reset-query');
	socket.emit('search-query', {query: query, users: userQuery, resultsLoaded: numberOfSearchResultsLoaded});

}, 200); 

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		}, wait);
		if (immediate && !timeout) func.apply(context, args);
	};
}

$.fn.exists = function () {
    return this.length !== 0;
}



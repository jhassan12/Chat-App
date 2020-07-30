$(document).ready(function() {
	document.addEventListener('touchstart', function(){}, {passive: true});

	$(window).load(function(){
	   $('input').each(function(){
	
	   		if ($('input').val().length) {
	   			$('input').focus();
	   			$('input').blur();
	   		}
	   });

	   $('.account-error').remove();
	   $('input').css('border-bottom-color', 'white');
	});

	$('input').on('focusout', function(){
		const name = $(this).attr('name');
		
		if (!$(this).val().length) {
			createErrorMessage(name, 'This field is required');
			return;
		}
	});

	$('input').on('input', function(){
		const name = $(this).attr('name');
		const errorSelector = "div[data-type-error='" + name + "']"; 

		if (!isLogin()) {
			/* Sign up */ 
			const text = $(this).val();

			switch (name) {
			case 'username':
				if (text.length < 3 || text.length > 50) {
					createErrorMessage(name, 'Username should be between 3 and 50 characters');
					return;
				}

				if (!isAlphanumeric(text)) {
					createErrorMessage(name, 'Username should only contain letters and numbers');
					return;
				}
				break;

			case 'password':
				if (text.length < 8) {
					createErrorMessage(name, 'Password should be at least 8 characters long');
					return;
				}

				if (text === $('#cpassword').val()) {
					var errorDiv = $("div[data-type-error='cpassword']");

					if (errorDiv.exists() && errorDiv.text() === 'Passwords do not match') {
						errorDiv.remove();
						$('#cpassword').css('border-bottom-color', 'white');
					}
				}
				break;

			case 'cpassword':
				if (text != $('#password').val()) {
					createErrorMessage(name, 'Passwords do not match');
					return;
				}
				break;
			}

			$(errorSelector).remove();
			$('#' + name).css('border-bottom-color', 'white');

		} else {
			/* Login */
			if ($(this).val().length) {
				$(errorSelector).remove();
				$('#' + name).css('border-bottom-color', 'white');
			}
		}

	});

	$('input').on('keydown', function(e){
		return e.which !== 32;
	});

	$('button').click(function(e){
		checkForEmptyFields(e);
	});
});

function checkForEmptyFields(e) {
	const errorMessage = 'This field is required';
	var error = false;

	if ($('.account-error').exists()) {
		error = true;
	}

	if (!$('#username').val().length) {
		createErrorMessage('username', errorMessage);
		error = true;
	}

	if (!$('#password').val().length) {
		createErrorMessage('password', errorMessage);
		error = true;
	}

	if (error) {
		$('#password').val('');
		e.preventDefault();
	} 

	if (!isLogin()) {
		if (!$('#cpassword').val().length) {
			error = true;
			createErrorMessage('cpassword', errorMessage);
			e.preventDefault();
		} else if (error) {
			$('#cpassword').val('');
		}
	}
}

function setCookie(key, value, path) {
	const date = new Date();
	date.setTime(date.getTime() + (60 * 60 * 24 * 1000));
	document.cookie = `${key}=${value}; expires=${date.toGMTString()}; path=${path}`;
}

function isLogin() {
	var pattern = /.+\/(.+)$/
	match = window.location.href.match(pattern);
	return match[1] === 'login';
}

function isAlphanumeric(string) {
	pattern = /^[0-9a-zA-Z]+$/

	return string.match(pattern) != null;
}

function createErrorMessage(type, content) {
	const errorSelector = "div[data-type-error='" + type + "']"; 

	if ($(errorSelector).text() === content) {
		return;
	}

	if ($(errorSelector).exists()) {
		$(errorSelector).text(content);
		return;
	}

	const errorContainer = document.createElement('div');
	const labelSelector = "label[for = '" + type + "']"

	errorContainer.className = 'account-error';
	$(errorContainer).attr('data-type-error', type);
	$(errorContainer).text(content);

	$(errorContainer).insertAfter($(labelSelector));
	$('#' + type).css('border-bottom-color', 'red');
}

function getCookie(name) {
 	var match = document.cookie.match(RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
 	return match ? match[1] : null;
}

$.fn.exists = function () {
    return this.length !== 0;
}
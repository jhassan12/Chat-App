$(document).ready(function() {
	$('input').on('focusout', function(){
		const name = $(this).attr('name');
	
		if (!$(this).val().length) {
			createErrorMessage(name, 'This field is required');
			return;
		}
	});

	$('input').on('input', function(){
		const name = $(this).attr('name');
		const text = $(this).val();
		const errorSelector = "div[data-type-error='" + name + "']"; 

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
	});

	$('input').on('keydown', function(e){
		return e.which !== 32;
	});

	$('button').click(function(e){
		const errorMessage = 'This field is required';

		if ($('.account-error').exists()) {
			e.preventDefault();
		}

		if (!$('#username').val().length) {
			createErrorMessage('username', errorMessage);
			e.preventDefault();
		}

		if (!$('#password').val().length) {
			createErrorMessage('password', errorMessage);
			e.preventDefault();
		}

		if (!$('#cpassword').val().length) {
			createErrorMessage('cpassword', errorMessage);
			e.preventDefault();
		}

		$('#password').val('');
		$('#cpassword').val('');
	});
});

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

$.fn.exists = function () {
    return this.length !== 0;
}
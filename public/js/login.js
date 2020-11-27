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
		const errorSelector = "div[data-type-error='" + name + "']"; 

		if ($(this).val().length) {
			$(errorSelector).remove();
			$('#' + name).css('border-bottom-color', 'white');
		}
	});

	$('input').on('keydown', function(e){
		return e.which !== 32;
	});

	$('button').click(function(e){
		const errorMessage = 'This field is required';
		var correctFields = true;

		if ($('.account-error').exists()) {
			e.preventDefault();
			correctFields = false;
		}

		if (!$('#username').val().length) {
			createErrorMessage('username', errorMessage);
			e.preventDefault();
			correctFields = false;
		}

		if (!$('#password').val().length) {
			createErrorMessage('password', errorMessage);
			e.preventDefault();
			correctFields = false;
		}

		$('#password').val('');

		if (!correctFields) {
			document.cookie = "user=" + $('#username').val();
		}
	});
});

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
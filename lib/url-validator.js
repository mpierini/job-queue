var { URL } = require('url');

module.exports.validateURL = function (data) {
	var validated = {
		url: '',
		err: null
	};

	var url;
	try {
		url = new URL(data);
		url = url.href;
	} catch (error) {
		if (error.code !== 'ERR_INVALID_URL') {
			validated.err = error;
			return validated;
		}

		// if url is not missing protocol but still is invalid
		if (data.indexOf('http://') !== -1) {
			validated.err = error;
			return validated;
		}

		url = 'http://' + data;
	}

	validated.url = url;
	return validated;
};

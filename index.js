var express = require('express');
var router = express.Router();

var db = require('./db');
var { UNIQUE_VIOLATION } = require('pg-error-constants');

var request = require('request');
var { URL } = require('url');

function validateURL (data) {
	var url;
	try {
		url = new URL(data);
		url = url.href;
	} catch (error) {
		if (error.code !== 'ERR_INVALID_URL') {
			return res.status(500).send({err: error.message});
		}

		// if url is not missing protocol but still is invalid
		if (data.indexOf('http://') !== -1) {
			return res.status(400).send({err: error.message});	
		}

		url = 'http://' + data;
	}

	return url;
};

function addJob (req, res) {
	if (!req.body.url) {
		return res.status(400).send();
	}

	var url = validateURL(req.body.url);
	db.query('INSERT INTO jobs (url) VALUES ($1) RETURNING id', [req.body.url], function(err, result) {
		if (!err) {
			if (!result || !result.rows || !result.rows.length) {
				return res.status(404).send({err: 'job id not found'});
			}

			var id = result.rows[0].id;
			res.status(201).send({id: id});

			populateHTML(id, url);
			return;
		}

		if (err.code !== UNIQUE_VIOLATION) {
			return res.status(500).send({error: err.detail});
		}

		// if an entry with that url already exists, send back id
		db.query('SELECT id FROM jobs WHERE url = $1', [url], function(err, result) {
			if (err) {
				return res.status(500).send({err: err.detail});
			}

			if (!result || !result.rows || !result.rows.length) {
				return res.status(404).send({err: 'job id not found'});
			}

			res.status(200).send({id: result.rows[0].id});
		});
	});
};

function populateHTML (id, url) {
	request({
		method: 'GET',
		url: url,
	}, function(err, response, body) {
		if (err) {
			console.trace(err);
			return;
		}

		if (response.statusCode === 200) {
			// encode html body to base64 string
			var buffer = new Buffer(body);
			var encoded = buffer.toString('base64');

			db.query('UPDATE jobs SET html = $1, complete = $2 WHERE id = $3', [encoded, true, id], function(err, result) {
				if (err) {
					console.trace(err);
				}
			});
		}
	});
};

function getJobStatus (req, res) {
	if (!req.params.id) {
		return res.status(400).send({err: 'missing job id'});
	}

	db.query('SELECT * FROM jobs WHERE id = $1', [req.params.id], function(err, result) {
		if (err) {
			return res.status(500).send({err: err.detail});
		}

		if (!result || !result.rows || !result.rows.length) {
			return res.status(404).send({err: 'job id not found'});
		}

		var response = {
			id: req.params.id,
			url: result.rows[0].url,
			complete: false,
			html: '',
		};

		if (result.rows[0].complete === 'f') {
			return res.status(200).send(response);
		}

		// decode base64 string
		var buffer = new Buffer(result.rows[0].html.toString(), 'base64')
		var decoded = buffer.toString();

		response.complete = true;
		response.html = decoded;

		res.status(201).send(response);
	});
};

router.post('/job',
	addJob
);

router.get('/job/:id',
	getJobStatus
);

module.exports = router;

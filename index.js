var express = require('express');
var router = express.Router();

var db = require('./db');
var { UNIQUE_VIOLATION } = require('pg-error-constants');

var request = require('request');
var helper = require('./lib/url-validator.js');

function addJob (req, res) {
	if (!req.body.url) {
		return res.status(400).send();
	}

	var validated = helper.validateURL(req.body.url);
	if (validated.err) {
		return res.status(500).send({err: validated.err.message});
	}

	db.query('INSERT INTO jobs (url) VALUES ($1) RETURNING id', [req.body.url], function(err, result) {
		if (!err) {
			if (!result || !result.rows || !result.rows.length) {
				return res.status(404).send({err: 'job id not found'});
			}

			var id = result.rows[0].id;
			return res.status(201).send({id: id});
		}

		if (err.code !== UNIQUE_VIOLATION) {
			var errMsg = err.detail || err.message;
			return res.status(500).send({error: errMsg});
		}

		// if an entry with that url already exists, send back id
		db.query('SELECT id FROM jobs WHERE url = $1', [req.body.url], function(err, result) {
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

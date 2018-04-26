#!/usr/bin/env node

var colors = require('colors');
var request = require('request');
var db = require('../db');
var async = require('neo-async');
var program = require('commander');
var helper = require('../lib/url-validator.js');

program
	.option('-i, --interval <minutes>', 'amount of time between processing job batches')
	.option('-l, --limit <rows>', 'number of rows to be processed in a batch')
	.parse(process.argv);

function getJobs(limit, cb) {
	// select one more job than limit to see if there are more rows
	db.query('SELECT * FROM jobs WHERE complete = $1 LIMIT $2', [false, limit + 1], function(err, result) {
		if (err) {
			return cb(err);
		}

		var moreJobs = false;
		if (!result || !result.rows || !result.rows.length) {
			return cb(null, [], moreJobs);
		}

		var rows = result.rows;
		if (rows.length > limit) {
			moreJobs = true;
			// slice off the extra job
			rows = rows.slice(0, -1);
		}

		cb(null, rows, moreJobs);
	});
};

function processNewJobs(limit, cb) {
	getJobs(limit, function(err, rows, moreJobs) {
		if (err) {
			return cb(err);
		}

		if (!moreJobs && !rows.length) {
			console.log('No jobs to process currently'.gray);
			return cb();
		}

		console.log('Processing '.green + rows.length + ' jobs'.green);

		var calls = [];
		rows.forEach(function(row) {
			calls.push(function(done) {
				populateHTML(row.id, row.url, done);
			});
		});

		async.series(calls, function(err, result) {
			if (err) {
				return cb(err);
			}

			if (!moreJobs) {
				console.log('Finished processing jobs'.yellow);
				return cb();
			}

			processNewJobs(limit, cb);
		});
	});
};

function populateHTML (id, url, cb) {
	var validated = helper.validateURL(url);
	if (validated.err) {
		return cb(validated.err);
	}

	request({
		method: 'GET',
		url: validated.url,
	}, function(err, response, body) {
		if (err) {
			return cb(err);
		}

		if (response.statusCode === 200) {
			// encode html body to base64 string
			var buffer = new Buffer(body);
			var encoded = buffer.toString('base64');

			db.query('UPDATE jobs SET html = $1, complete = $2 WHERE id = $3', [encoded, true, id], function(err, result) {
				if (err) {
					return cb(err);
				}

				cb();
			});
		}
	});
};

var main = function () {
	// set defaults if program run without options
	var interval = program.interval || 1; // minutes
	var limit = parseInt(program.limit) || 10;

	console.log('Checking job queue every '.cyan + interval + ' minute'.cyan);
	console.log('Each batch size is '.magenta + limit + ' rows'.magenta);

	setInterval(function() {
		processNewJobs(limit, function(err) {
			if (err) {
				console.log('Error: '.red, err.message.red);
				process.exit(1);
			}
		});
	}, 60 * 1000 * interval); // milliseconds
};

main();

var { Pool } = require('pg');
var config = require('../config.js');

var pool = new Pool({
	user: config.db.postgres,
	host: config.db.host,
	database: config.db.database,
	password: config.db.password,
	port: config.db.port,
});

module.exports = {
	query: function(text, params, cb) {
		return pool.query(text, params, cb);
	}
};

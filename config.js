var config = {
	db: {
		user: process.env.PGUSER || 'postgres',
		host: process.env.PGHOST || 'localhost',
		database: 'jobqueue',
		password: process.env.PGPASSWORD,
		port: process.env.PGPORT || 5432,
	}
};

module.exports = config;

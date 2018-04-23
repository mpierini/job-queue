DROP DATABASE IF EXISTS jobqueue;
CREATE DATABASE jobqueue;

\c jobqueue;

CREATE TABLE jobs (
	id SERIAL PRIMARY KEY UNIQUE,
	url VARCHAR UNIQUE,
	html BYTEA,
	complete BOOLEAN DEFAULT false,
	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
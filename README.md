# job-queue
This API was built on Ubuntu 16.04 LTS using Node.js on v9.2.1 and npm 5.5.1.

Run this to install postgresql:
`sudo apt-get install postgresql postgresql-contrib`

Run this command to apply the migration that creates the database and table used by the program:
`sudo -u <username> psql -f job-queue.sql`

The `config.js` file includes support for environment variables if you are not using the default Postgresql user, host, or port.
Set the environment variable for your user's password:
`export PGPASSWORD="your-password"`

Install dependencies:
`npm install`

Start the API:
`node app.js`

To add a job:
`curl -XPOST localhost:5000/job -d '{"url":"www.google.com"}' -H "content-type: application/json"`
Response:
`{id: 1}`

To check job status:
`curl -XGET localhost:5000/job/1`
Response:
`{
	id: 1,
	url: "http://www.google.com"
	complete: true
	html: "<!doctype html><html xml…;</script></body></html>"
}`

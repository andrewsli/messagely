# Messagely

Messagely is a backend for messaging between one another.

The server is integrated with Twilio's API and can send a message to the user when a message is received.

# Tech/framework/API used
**Built with:**
- Express
- PostgreSQL
- Twilio API

# How to use
Create database and tables:
```
createdb messagely
createdb messagely-test

psql messagely < seed.sql
createdb messagely-test < seed.sql

```
Install all dependencies:
```
npm install
```

To run tests:
```
jest -i
```

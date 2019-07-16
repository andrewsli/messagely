/** User class for message.ly */

const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR } = require("../config")

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    if (await userExists(username) === true) {
      throw new ExpressError("User already exists.", 401)
    } else {
      try {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
        let result = await db.query(`
          INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
          VALUES ($1, $2, $3, $4, $5, LOCALTIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING username, password, first_name, last_name, phone`,
          [username, hashedPassword, first_name, last_name, phone])
        return result.rows[0];
      } catch (err) {
        throw new ExpressError("Something went wrong. Try again.", 500)
      }
    }
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    //get hashed password
    let result = await db.query(`
    SELECT password FROM users
    WHERE username = $1`,
      [username]);

    if (result.rowCount === 0) {
      throw new ExpressError("Invalid username or password.", 400);
    }

    let hashedPassword = result.rows[0].password;

    //return password check results
    return (await bcrypt.compare(password, hashedPassword));
  }


  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    try {
      let result = await db.query(`
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP
      WHERE username = $1
      RETURNING username, last_login_at`,
        [username]);
      if (result.rows[0]) {
        return null;
      } else {
        throw new ExpressError("USER NOT FOUND", 401);
      }
    } catch (err) {
      throw new ExpressError("Something went wrong, try again.", 500)
    }
  }


  /** change password in db, return { username } */

  static async changePassword(username, newPassword){
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_WORK_FACTOR)
        let result = await db.query(`
          UPDATE users
          SET password = $1
          WHERE username = $2
          RETURNING username`,
          [hashedPassword, username])
        return result.rows[0];
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    try {
      let results = await db.query(`
      SELECT username, first_name, last_name, phone
      FROM users`);
      return results.rows;
    } catch (err) {
      throw new ExpressError("Something went wrong, try again.", 500);
    }
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    let result = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1`,
      [username]);

    if (result.rowCount === 0) {
      throw new ExpressError("User not found");
    }

    let user = result.rows[0];
    return {
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      join_at: new Date(user.join_at),
      last_login_at: user.last_login_at? new Date(user.last_login_at): null
    }
  }


  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    let messages = [];
    try {
      let messageResults = await db.query(`
      SELECT id, body, sent_at, read_at, username, first_name, last_name, phone
      FROM messages
      JOIN users ON users.username = to_username
      WHERE from_username = $1`,
        [username]);
      for (let msg of messageResults.rows) {
        messages.push({
          id: msg.id,
          body: msg.body,
          sent_at: new Date(msg.sent_at),
          read_at: msg.read_at? new Date(msg.read_at):null,
          to_user: {
            username: msg.username,
            first_name: msg.first_name,
            last_name: msg.last_name,
            phone: msg.phone
          }
        });
      }
      return messages;
    } catch (err) {
      throw new ExpressError("Something went wrong, try again.", 500);
    }
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    let messages = [];
    try {
      let messageResults = await db.query(`
      SELECT id, body, sent_at, read_at, username, first_name, last_name, phone
      FROM messages
      JOIN users ON users.username = from_username
      WHERE to_username = $1`,
        [username]);

      for (let msg of messageResults.rows) {
        messages.push({
          id: msg.id,
          body: msg.body,
          sent_at: new Date(msg.sent_at),
          read_at: msg.read_at? new Date(msg.read_at):null,
          from_user: {
            username: msg.username,
            first_name: msg.first_name,
            last_name: msg.last_name,
            phone: msg.phone
          }
        });
      }
      return messages;
    } catch (err) {
      throw new ExpressError("Something went wrong, try again.", 500);
    }
  }
}

module.exports = User;

async function userExists(username) {
  let result = await db.query(`
  SELECT username FROM users
  WHERE username = $1`,
    [username]);
  if (result.rowCount === 1) {
    return true;
  }
  return false;
}

/** Message class for message.ly */
require('dotenv').config();

const db = require("../db");
const ExpressError = require("../expressError");
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const fromNumber = process.env.FROMNUMBER;
const client = require('twilio')(accountSid, authToken);

/** Message on the site. */

class Message {

  /** register new message -- returns
   *    {id, from_username, to_username, body, sent_at}
   */

  static async create({ from_username, to_username, body }) {
    const result = await db.query(
      `INSERT INTO messages (
              from_username,
              to_username,
              body,
              sent_at)
            VALUES ($1, $2, $3, current_timestamp)
            RETURNING id, from_username, to_username, body, sent_at`,
      [from_username, to_username, body]);

    return result.rows[0];
  }

  /** send text message (body) to phone # (phone)
   * where phone is a string
   */
  static sendSMS(phone, body) {
    client.messages
      .create({
        body: body,
        from: fromNumber,
        to: phone
      })
      .then(message => console.log(message.sid));
  }

  /** Update read_at for message */

  static async markRead(id) {
    const result = await db.query(
      `UPDATE messages
           SET read_at = current_timestamp
           WHERE id = $1
           RETURNING id, read_at`,
      [id]);

    if (!result.rows[0]) {
      throw new ExpressError(`No such message: ${id}`, 404);
    }
    return result.rows[0];
  }

  /** Get: get message by id
   *
   * returns {id, from_user, to_user, body, sent_at, read_at}
   *
   * both to_user and from_user = {username, first_name, last_name, phone}
   *
   */

  static async get(id) {
    const result = await db.query(
      `SELECT m.id,
                m.from_username,
                f.first_name AS from_first_name,
                f.last_name AS from_last_name,
                f.phone AS from_phone,
                m.to_username,
                t.first_name AS to_first_name,
                t.last_name AS to_last_name,
                t.phone AS to_phone,
                m.body,
                m.sent_at,
                m.read_at
          FROM messages AS m
            JOIN users AS f ON m.from_username = f.username
            JOIN users AS t ON m.to_username = t.username
          WHERE m.id = $1`,
      [id]);

    let m = result.rows[0];

    if (!m) {
      throw new ExpressError(`No such message: ${id}`, 404);
    }

    return {
      id: m.id,
      from_user: {
        username: m.from_username,
        first_name: m.from_first_name,
        last_name: m.from_last_name,
        phone: m.from_phone,
      },
      to_user: {
        username: m.to_username,
        first_name: m.to_first_name,
        last_name: m.to_last_name,
        phone: m.to_phone,
      },
      body: m.body,
      sent_at: m.sent_at,
      read_at: m.read_at,
    };
  }

  // random number from "000000" to "999999"
  static generateVerificationCode() {
    let code = Math.floor(Math.random() * 1000000).toString();
    let numLeadZeros = 6 - code.length;
    if (numLeadZeros > 0) {
      return `Your verification code is: ${'0'.repeat(numLeadZeros) + code}`;
    }
    else {
      return code;
    }
  }
}


module.exports = Message;
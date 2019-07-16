require('dotenv').config();

const User = require("../models/user");
const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const accountSid = process.env.ACCOUNTSID;
const authToken = process.env.AUTHTOKEN;
const serviceSid = process.env.SERVICESID;
const client = require('twilio')(accountSid, authToken);


app.use(express.json());

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post('/login', async function (req, res, next) {
  try {
    const { username, password } = req.body;
    if (await User.authenticate(username, password) === true) {
      let token = jwt.sign({ username }, SECRET_KEY);
      await User.updateLoginTimestamp(username);
      return res.json({ token });
    } else {
      throw new ExpressError("Invalid username or password.", 400);
    }
  } catch (err) {
    next(err);
  }
})


/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async function (req, res, next) {
  try {
    const { username, password, first_name, last_name, phone } = req.body;
    const registrationInfo = {
      username,
      password,
      first_name,
      last_name,
      phone
    }
    let newUser = await User.register(registrationInfo);
    let token = jwt.sign({ username: newUser.username }, SECRET_KEY);
    return res.json({ token });
  } catch (err) {
    next(err);
  }
})

/** GET /change-password?username= - sends 6 digit verification code to user via phone SMS
 * => "000000" to "999999"
 * lasts 10 mins, linked to phone #
 */
router.get('/change-password', async function (req, res, next) {
  try {
    let username = req.query.username;
    // check if user exists. If it does not exist, .get() will throw an error
    let { phone } = await User.get(username);

    //sends sms to phone number
    client.verify.services(serviceSid)
      .verifications
      .create({ to: phone, channel: 'sms' })
      .then(verification => console.log(verification.sid));

    return res.json({ message: "code has been sent" });
  } catch (err) {
    next(err);
  }
})

/** POST /change-password 
 * {code, password, username} => {message: "password has been updated"}
 * code is string of 6 numbers from GET /change-password
 */
router.post('/change-password', async function (req, res, next) {
  try {
    const { code, password, username } = req.body;
    // check if user exists. If it does not exist, .get() will throw an error
    let { phone } = await User.get(username);

    // check if user's verfication code is correct
    client.verify.services(serviceSid)
      .verificationChecks
      .create({ to: phone, code })
      .then(verification_check => console.log(verification_check.status));

    // update password
    let user = await User.changePassword(username, password);
    return res.json({ message: `Password has been updated for ${user.username}` });
  } catch (err) {
    next(err);
  }
})


module.exports = router;
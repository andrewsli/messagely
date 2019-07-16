const User = require("../models/user");
const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = express.Router();
const { ensureLoggedIn, ensureCorrectUser } = require("../middleware/auth");

app.use(express.json());


/** GET / - get list of users.
 *
 * => {users: [{username, first_name, last_name, phone}, ...]}
 *
 **/

router.get('/', ensureLoggedIn, async function (req, res, next) {
  try {
    let users = await User.all();
    return res.json({ users })
  } catch (err) {
    next(err);
  }
})


/** GET /:username - get detail of users.
 *
 * => {user: {username, first_name, last_name, phone, join_at, last_login_at}}
 *
 **/
router.get('/:username', ensureCorrectUser, async function (req, res, next) {
  try {
    let user = await User.get(req.params.username);
    return res.json({ user });
  } catch (err) {
    next(err);
  }
})

/** GET /:username/to - get messages to user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 from_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
router.get("/:username/to", ensureCorrectUser, async function (req, res, next) {
  try {
    let messages = await User.messagesTo(req.params.username);
    return res.json({ messages })
  } catch (err) {
    next(err);
  }
})

/** GET /:username/from - get messages from user
 *
 * => {messages: [{id,
 *                 body,
 *                 sent_at,
 *                 read_at,
 *                 to_user: {username, first_name, last_name, phone}}, ...]}
 *
 **/
router.get("/:username/from", ensureCorrectUser, async function (req, res, next) {
  try {
    let messages = await User.messagesFrom(req.params.username);
    return res.json({ messages })
  } catch (err) {
    next(err);
  }
})

module.exports = router;
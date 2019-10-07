const User = require("../models/user")
const Message = require("../models/message");
const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = express.Router();
const { ensureLoggedIn } = require("../middleware/auth");

app.use(express.json());

/** GET /:id - get detail of message.
 *
 *  => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async function (req, res, next) {
  try {
    let message = await Message.get(req.params.id);
    let toUser = message.to_user.username;
    let fromUser = message.from_user.username;
    if (req.user.username === toUser || req.user.username === fromUser){
      return res.json({ message });
    }
    throw new ExpressError("You are forbidden from viewing this message", 403)
  } catch (err) {
    next(err);
  }

})


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async function (req, res, next) {
  try {
    const { to_username, body} = req.body;
    const message = {
      from_username: req.user.username,
      to_username,
      body
    };

    let { phone } = await User.get(to_username);
    let newMessage = await Message.create(message);

    Message.sendSMS(phone, body);
    return res.json({ newMessage });
  } catch (err) {
    next(err);
  }

})

/** POST/:id/read - mark message as read:
 *
 * {_token} => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async function (req, res, next) {
  try {
    let msg = await Message.get(req.params.id);
    let recipient = msg.to_user.username;

    if (req.user.username === recipient) {
      let message = await Message.markRead(req.params.id);
      return res.json({ message });
    } else {
      throw new ExpressError("You can't mark this message as read.", 401);
    }
  } catch (err) {
    next(err);
  }
})

module.exports = router;
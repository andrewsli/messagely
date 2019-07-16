const User = require("../models/user");
const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");


app.use(express.json());

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/

router.post('/login', async function (req, res, next) {
  try{
    const { username, password } = req.body;
    if( await User.authenticate(username, password) === true){
      let token = jwt.sign({ username }, SECRET_KEY);
      await User.updateLoginTimestamp(username);
      return res.json({ token });
    } else{
      throw new ExpressError("Invalid username or password.", 400);
    }
  }catch(err){
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
  try{
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
  }catch(err){
    next(err);
  }
})
module.exports = router;
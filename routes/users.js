const express = require('express');
const bcrypt = require('bcrypt');
const _ = require('lodash');
const { User, validate, validatePassword } = require('../models/user');
const { Card } = require('../models/card');
const auth = require('../middleware/auth');
const router = express.Router();

//delete user. validate user & password
router.delete('/me', auth, async (req, res) => {
  const { error } = validatePassword(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const userId = req.user._id;
  let user = await User.findOne({ _id: userId });
  if (!user) return res.status(400).send("Invalid user or password.");

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword) return res.status(400).send('Invalid user or password.');
  
  if (req.user.biz) {
    /* if the user is a business delete all user cards and their representations (in other users favorites).
    userCardIds contains the card ids as strings instead of objectIds.
    likedBy contains the ids of users who liked the deleted users cards.  */
    const userCardIds = [];
    let likedBy = [];
    await Card.find({ 'user_id': userId }, async (err, res) => {
      if (err) return console.log(err, 'card not found');
      res.forEach(card => {
        userCardIds.push(`${card._id}`);
        likedBy = likedBy.concat(card.likedBy);
      });
    }).then(async () => {
      if (userCardIds.length) {
        await Card.deleteMany({ 'user_id': userId });
        if (likedBy.length) {
          // if a user card has likes, trim duplicates in likedBy array and update any user whose id is included in likedBy array. 
          likedBy = _.uniq(likedBy);
          await User.updateMany({ '_id': { $in: likedBy } },
            { $pull: { 'favorites': { $in: userCardIds } } })
        };
      };
    });
  };
  //removal for both user types, decrement 1 from 'likeAmount' in all the user favorite cards and remove the user id from their 'likedBy' field
  await Card.updateMany({ 'likedBy': { $in: userId } },
    { $pull: { 'likedBy': userId }, $inc: { likeAmount: -1 } });
  await User.deleteOne({ _id: userId });
  res.send('User deleted successfuly');
});

//signup: validate the request, check if email is already registered and create the new user with an encrypted password
router.post('/', async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let user = await User.findOne({ email: req.body.email });
  if (user) return res.status(400).send('User already registered.');

  user = new User(_.pick(req.body, ['name', 'email', 'password', 'biz']));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();
  res.send(_.pick(user, ['_id', 'name', 'email']));

});

module.exports = router; 
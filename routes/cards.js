const express = require("express");
const _ = require("lodash");
const { Card, validateCard, generateBizNumber, validateId } = require("../models/card");
const { User } = require("../models/user");
const auth = require("../middleware/auth");
const router = express.Router();

//get top 3 cards for home page
router.get("/top", async (req, res) => {
  const cards = await Card.find({}).sort({ likeAmount: -1 }).limit(3);
  res.send(cards);
})

/* browse page route.
fetch the query params into variables and figure sorting option */
router.get("/search", async (req, res) => {
  const query = req.query.q;
  const page = req.query.p || 1;
  const order = req.query.o || '';
  let sort = {};
  switch (order) {
    case 'name':
      sort.bizName = 1;
      break;
    case 'newest':
      sort.createdAt = -1;
      break;
    case 'oldest':
      sort.createdAt = 1;
      break;
    default:
      sort.likeAmount = -1;
  }
  //regex is the search query, byQuery includes the query for mongo, limit is the amount of cards per page and skip is the amount of cards before that page
  const regex = new RegExp(query);
  const limit = 9;
  let skip = ( page - 1 ) * limit;
  let byQuery = {}
  let cards = [];
  let total = [];

  if (!query) {
    // if the request doesn't have a value for the search, find the cards by sort option and page only
    cards = await Card.find({}).sort(sort).skip(skip).limit(limit);
    total = await Card.countDocuments()
  } else {
    // if the request DOES have a value for the search, prepare byQuery as a query for mongo
    byQuery.$or = [
        { bizName: { $regex: regex, $options: "i" } },
        { bizDescription: { $regex: regex, $options: "i" } },
        { bizNumber: { $regex: regex, $options: "i" } },
      ]
    total = await Card.countDocuments(byQuery);
    if (total < skip) skip = 0;
    // if user requested a page too high, return first page.
    // look in db by search value, sort option and page
    cards = await Card.find(byQuery).sort(sort).skip(skip).limit(limit);
  }
  res.send({ cards, total });
});


// get user favorite cards 
router.get('/my-favorites', auth, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) return res.status(400).send('Bad Request');
  
  const { favorites } = _.pick(user, 'favorites')
  if (!favorites) return res.send(favorites);
  
  const cards = await Card.find({ "_id": { $in: favorites } });
  res.send(cards);
});

/* toggle like: push\pull cardId in the user 'favorites' array and userId in the card 'likedBy' array,
increment\decrement from card 'likeAmount'  */
router.patch('/my-favorites', auth, async (req, res) => {
  const cardId = req.body.cardId;
  const userId = req.user._id;
  const { error } = validateId({ id: cardId });
  if (error) return res.status(400).send(error.details[0].message);
  
  const user = await User.findById(userId);
  if (!user) return res.status(400).send('Bad Request');
  
  await Card.findById(cardId, async (err, card) => {
    if (err || !card) return res.status(404).send('The specified card was not found.');
    
    if (card.likedBy.includes(userId)) {
      user.favorites.pull(cardId);
      card.likedBy.pull(userId);
      card.likeAmount--;
    } else {
      user.favorites.push(cardId);
      card.likedBy.push(userId);
      card.likeAmount++;
    }
    await Promise.all([card.save(), user.save()]);
    res.send({ card });
  })
});

// get all of the user owned cards
router.get("/my-cards", auth, async (req, res) => {
  if (!req.user.biz) return res.status(401).send("Access denied.");
  const cards = await Card.find({ user_id: req.user._id });
  res.send(cards);
});

//delete a single card
router.delete("/:id", auth, async (req, res) => {
  const card = await Card.findOneAndRemove({
    _id: req.params.id,
    user_id: req.user._id,
  });
  if (!card) return res.status(404).send("The card with the given ID was not found.");
  await User.updateMany({ 'favorites': { $in: req.params.id } },
    { $pull: { 'favorites': req.params.id } });
  res.send(card);
});

//update a single card
router.put("/:id", auth, async (req, res) => {
  const { error } = validateCard(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let card = await Card.findOneAndUpdate(
    { _id: req.params.id, user_id: req.user._id },
    req.body
  );
  if (!card)
    return res.status(404).send("The card with the given ID was not found.");

  card = await Card.findOne({ _id: req.params.id, user_id: req.user._id });
  res.send({card});
});

//find a card (before updating it)
router.get("/:id", auth, async (req, res) => {
  const card = await Card.findOne({
    _id: req.params.id,
    user_id: req.user._id,
  });
  if (!card)
    return res.status(404).send("The card with the given ID was not found.");
  res.send(card);
});

//create a new card
router.post("/", auth, async (req, res) => {
  const { error } = validateCard(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  let card = new Card({
    bizName: req.body.bizName,
    bizDescription: req.body.bizDescription,
    bizAddress: req.body.bizAddress,
    bizPhone: req.body.bizPhone,
    bizImage: req.body.bizImage
      ? req.body.bizImage
      : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png",
    bizNumber: await generateBizNumber(Card),
    user_id: req.user._id,
    likedBy: [],
    likeAmount: 0
  });

  post = await card.save();
  res.send(post);
});

module.exports = router;
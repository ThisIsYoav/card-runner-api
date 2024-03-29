const Joi = require('@hapi/joi');
const mongoose = require('mongoose');
const _ = require('lodash');

// cards mongoose schema for db
const cardSchema = new mongoose.Schema({
  bizName: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 255
  },
  bizDescription: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 1024
  },
  bizAddress: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 400
  },
  bizPhone: {
    type: String,
    required: true,
    minlength: 9,
    maxlength: 10
  },
  bizImage: {
    type: String,
    required: true,
    minlength: 11,
    maxlength: 1024
  },
  bizNumber: {
    type: String,
    required: true,
    minlength: 3,
    maxlength: 99999999999,
    unique: true
  },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  likedBy: Array,
  likeAmount: {
    type: Number,
  min: 0}
});

const Card = mongoose.model('Card', cardSchema);

// card details validation schema for Joi on request entry to server
function validateCard(card) {

  const schema = Joi.object({
    bizName: Joi.string().min(2).max(255).required(),
    bizDescription: Joi.string().min(2).max(1024).required(),
    bizAddress: Joi.string().min(2).max(400).required(),
    bizPhone: Joi.string().min(9).max(10).required().regex(/^0[2-9]\d{7,8}$/),
    bizImage: Joi.string().min(11).max(1024)
  });

  return schema.validate(card);
}

// id validation schema for Joi on request entry to server
function validateId(data) {

  const schema = Joi.object({
    id: Joi.string().required()
  });

  return schema.validate(data);
}

// business number generation
async function generateBizNumber(Card) {

  while (true) {
    let randomNumber = _.random(1000, 999999);
    let card = await Card.findOne({ bizNumber: randomNumber });
    if (!card) return String(randomNumber);
  }

}

exports.Card = Card;
exports.validateCard = validateCard;
exports.validateId = validateId;
exports.generateBizNumber = generateBizNumber;
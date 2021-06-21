const Joi = require('@hapi/joi');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('config');

// users mongoose schema for db
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 255
  },
  email: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 255,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 1024
  },
  biz: {
    type: Boolean,
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  favorites: Array
});

// generate authorization token
userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign({ _id: this._id, biz: this.biz, name: this.name }, config.get('jwtKey'));
  return token;
}

const User = mongoose.model('User', userSchema);

// user sign up validation schema for Joi on request entry to server
function validateUser(user) {

  const schema = Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().min(6).max(255).required().email(),
    password: Joi.string().min(6).max(1024).required(),
    biz: Joi.boolean().required()
  });

  return schema.validate(user);
}

// user password validation schema for Joi on request entry to server
function validatePassword(req) {
  const schema = Joi.object({
    password: Joi.string().min(6).max(1024).required()
  });
  return schema.validate(req);
};

exports.User = User;
exports.validate = validateUser;
exports.validatePassword = validatePassword;
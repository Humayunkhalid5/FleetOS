const db = require('../data/db');

const Review = {
  create(data) {
    return db.create('reviews', data);
  },

  find(query = {}) {
    return db.find('reviews', query);
  },

  findById(id) {
    return db.findById('reviews', id);
  },

  findOne(query = {}) {
    return db.findOne('reviews', query);
  },
};

module.exports = Review;


const db = require('../data/db');

// In-memory chat message model — no MongoDB required.
const ChatMessage = {
  find(query = {}) {
    return db.find('chatMessages', query).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  create(data) {
    return db.create('chatMessages', data);
  },

  findById(id) {
    return db.findById('chatMessages', id);
  },
};

module.exports = ChatMessage;


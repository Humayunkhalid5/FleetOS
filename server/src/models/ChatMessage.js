const mongoose = require('mongoose');
const db = require('../data/db');

const chatMessageSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, index: true },
    sender: { type: String, required: true },
    senderName: { type: String, default: '' },
    senderRole: { type: String, default: 'customer' },
    recipient: { type: String, default: '' },
    recipientRole: { type: String, default: 'company' },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const ChatMessageModel = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);
const isMongoConnected = () => mongoose.connection.readyState === 1;

const ChatMessage = {
  async find(query = {}) {
    if (isMongoConnected()) {
      try {
        const results = await ChatMessageModel.find(query).sort({ createdAt: 1 });
        return results;
      } catch (err) {}
    }
    return db.find('chatMessages', query).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  async create(data) {
    if (isMongoConnected()) {
      try {
        const record = await ChatMessageModel.create(data);
        return record.toObject ? record.toObject() : record;
      } catch (err) {}
    }
    return db.create('chatMessages', data);
  },

  async findById(id) {
    if (isMongoConnected()) {
      try {
        return await ChatMessageModel.findById(id);
      } catch (err) {}
    }
    return db.findById('chatMessages', id);
  },
};

module.exports = ChatMessage;

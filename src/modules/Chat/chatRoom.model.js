const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    type: {
      type: String,
      enum: ['direct', '3-way', 'group'],
      default: '3-way',
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    athlete: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    coach: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    lastMessageAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ChatRoom', chatRoomSchema);

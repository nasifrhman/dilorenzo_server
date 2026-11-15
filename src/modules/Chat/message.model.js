const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRoom',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    messageType: {
      type: String,
      enum: ['text', 'voice', 'audio', 'video', 'image', 'file', 'media'],
      default: 'text',
    },
    content: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    mediaDuration: { type: Number, default: 0 }, // in seconds for voice/video
    fileName: { type: String, default: '' },
    fileSize: { type: String, default: '' },
    fileType: { type: String, default: '' },
    linkCard: {
      title: { type: String, default: '' },
      url: { type: String, default: '' },
      type: { type: String, default: '' },
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Message', messageSchema);

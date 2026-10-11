const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    athlete: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    description: { type: String, required: true }, // e.g. "90-Day Mentorship Admission"
    amount: { type: Number, required: true }, // In GBP e.g. 450.00
    currency: { type: String, default: 'GBP', uppercase: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    stripeInvoiceId: { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    stripeCustomerId: { type: String, default: '' },
    invoicePdfUrl: { type: String, default: '' },
    paymentMethod: { type: String, default: 'card' },
    paidAt: { type: Date, default: null },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who created the invoice
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', paymentSchema);

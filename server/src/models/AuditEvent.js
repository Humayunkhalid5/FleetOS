const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, index: true },
  targetType: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reason: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  requestId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.models.AuditEvent || mongoose.model('AuditEvent', auditEventSchema);

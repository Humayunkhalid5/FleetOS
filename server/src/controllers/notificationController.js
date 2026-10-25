const Notification = require('../models/Notification');

async function createNotification({ recipientUser = null, recipientCompany = null, title, message, type = 'booking', referenceId = '', link = '', io = null }) {
  const notification = await Notification.create({
    recipientUser,
    recipientCompany,
    title,
    message,
    type,
    referenceId,
    link,
    read: false,
  });

  if (io) {
    if (recipientCompany) io.to(`company:${recipientCompany}`).emit('notification:new', notification);
    if (recipientUser) io.to(`customer:${recipientUser}`).emit('notification:new', notification);
  }

  return notification;
}

// Notification routes only require a session, so derive the company from it.
const companyIdOf = (req) => req.company?._id || req.user.company?._id || req.user.company;

exports.getMyNotifications = async (req, res) => {
  const filter = req.user.role === 'company'
    ? { recipientCompany: companyIdOf(req) }
    : { recipientUser: req.user._id };

  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return res.json({ notifications, unreadCount });
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const filter = { _id: id };
  if (req.user.role === 'company') filter.recipientCompany = companyIdOf(req);
  if (req.user.role === 'customer') filter.recipientUser = req.user._id;

  const notification = await Notification.findOneAndUpdate(filter, { read: true }, { new: true });
  if (!notification) return res.status(404).json({ message: 'Notification not found' });

  return res.json({ notification });
};

exports.markAllAsRead = async (req, res) => {
  const filter = req.user.role === 'company'
    ? { recipientCompany: companyIdOf(req) }
    : { recipientUser: req.user._id };

  await Notification.updateMany(filter, { read: true });
  return res.json({ success: true });
};

exports.createNotification = createNotification;

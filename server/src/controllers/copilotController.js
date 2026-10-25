const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const Inventory = require('../models/Inventory');
const Payment = require('../models/Payment');
const { rankTechniciansForBooking } = require('../services/dispatchEngine');
const { broadcastBooking } = require('../socket');

exports.processCopilotMessage = async (req, res) => {
  const companyId = req.company._id;
  const prompt = String(req.body.prompt || req.body.message || '').trim();
  if (!prompt) return res.status(400).json({ message: 'Prompt message is required' });

  const lower = prompt.toLowerCase();

  // 1. Overloaded staff query
  if (lower.includes('overloaded') || lower.includes('workload') || lower.includes('busy technician')) {
    const activeBookings = await Booking.aggregate([
      { $match: { company: companyId, status: { $in: ['Assigned', 'En Route', 'Arrived', 'In Progress'] } } },
      { $group: { _id: '$technician', count: { $sum: 1 } } },
    ]);
    const technicians = await Technician.find({ company: companyId }).lean();
    const activeMap = activeBookings.reduce((m, b) => ({ ...m, [String(b._id)]: b.count }), {});

    const overloaded = technicians.map((tech) => {
      const active = activeMap[String(tech._id)] || 0;
      const capacity = tech.workloadCapacity || 5;
      const percentage = Math.round((active / capacity) * 100);
      return { ...tech, activeJobs: active, percentage };
    }).filter((t) => t.activeJobs >= 2 || t.percentage >= 60)
      .sort((a, b) => b.percentage - a.percentage);

    if (!overloaded.length) {
      return res.json({
        reply: 'All technicians currently have balanced workloads below 60%.',
        data: { overloadedCount: 0, technicians: [] },
      });
    }

    const techListText = overloaded.map((t) => `• **${t.name}**: ${t.activeJobs} active jobs (${t.percentage}% capacity)`).join('\n');
    return res.json({
      reply: `Found ${overloaded.length} technician(s) with elevated workload:\n\n${techListText}`,
      data: { overloadedCount: overloaded.length, technicians: overloaded },
    });
  }

  // 2. Who should handle booking #X / dispatch recommendation query
  if (lower.includes('who should handle') || lower.includes('recommend') || lower.includes('dispatch') || lower.includes('booking #') || lower.includes('fos-')) {
    const match = prompt.match(/(?:FOS-\d{4}-\d{6}|#?(\d+))/i);
    let bookingFilter = { company: companyId, status: 'Pending' };

    if (match) {
      const rawRef = match[0].replace(/^#/, '');
      bookingFilter = {
        company: companyId,
        $or: [{ reference: new RegExp(rawRef, 'i') }, { reference: `FOS-2026-${rawRef}` }],
      };
    }

    const booking = await Booking.findOne(bookingFilter).sort({ createdAt: -1 });
    if (!booking) {
      const pendingCount = await Booking.countDocuments({ company: companyId, status: 'Pending' });
      return res.json({
        reply: `No pending booking matching your query was found. Currently you have **${pendingCount} pending booking(s)**.`,
        data: null,
      });
    }

    const recommendations = await rankTechniciansForBooking(booking._id, companyId);
    if (!recommendations.length) {
      return res.json({
        reply: `Booking **${booking.reference}** (${booking.serviceSnapshot?.name}) requires assignment, but no active technicians are available.`,
        data: { booking },
      });
    }

    const top = recommendations[0];
    const replyText = `For **Booking ${booking.reference}** (${booking.serviceSnapshot?.name}):\n\n**Recommended: ${top.name} (Score: ${top.overallScore}/100)**\n• Skill Match: ${top.breakdown.skillMatchScore}%\n• Distance: ${top.distanceKm} km (~${top.etaMinutes} min ETA)\n• Workload: ${top.breakdown.workloadLevel} (${top.activeJobs} active jobs)\n• Rating: ${top.rating}/5\n\n*${top.explanation}*`;

    return res.json({
      reply: replyText,
      data: {
        actionRequired: true,
        actionType: 'ASSIGN_RECOMMENDATION',
        bookingId: booking._id,
        bookingReference: booking.reference,
        recommendedTechnicianId: top.technicianId,
        technicianName: top.name,
        score: top.overallScore,
        explanation: top.explanation,
        recommendations,
      },
    });
  }

  // 3. Assign command execution
  if (lower.includes('assign ') && (lower.includes(' to ') || lower.includes('booking'))) {
    // Parse technician name and booking ref
    const pendingBookings = await Booking.find({ company: companyId, status: 'Pending' }).sort({ createdAt: -1 }).lean();
    if (!pendingBookings.length) {
      return res.json({ reply: 'There are no pending bookings requiring assignment.' });
    }

    const technicians = await Technician.find({ company: companyId, status: { $ne: 'Off Duty' } }).lean();
    const matchedTech = technicians.find((t) => lower.includes(t.name.toLowerCase().split(' ')[0]));
    const targetBooking = pendingBookings[0];

    if (!matchedTech) {
      return res.json({
        reply: `Could not determine technician name from your prompt. Available technicians: ${technicians.map((t) => t.name).join(', ')}.`,
      });
    }

    return res.json({
      reply: `Please confirm assigning **${matchedTech.name}** to **Booking ${targetBooking.reference}** (${targetBooking.serviceSnapshot?.name}).`,
      data: {
        actionRequired: true,
        actionType: 'CONFIRM_ASSIGNMENT',
        bookingId: targetBooking._id,
        bookingReference: targetBooking.reference,
        technicianId: matchedTech._id,
        technicianName: matchedTech.name,
      },
    });
  }

  // 4. Revenue / Financial summary query
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('financial') || lower.includes('stat')) {
    const [payments, completedCount, pendingCount, lowStockCount] = await Promise.all([
      Payment.find({ company: companyId, status: 'recorded' }).lean(),
      Booking.countDocuments({ company: companyId, status: { $in: ['Completed', 'Paid'] } }),
      Booking.countDocuments({ company: companyId, status: 'Pending' }),
      Inventory.countDocuments({ company: companyId, $expr: { $lte: ['$quantity', '$reorderLevel'] } }),
    ]);

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const replyText = `**Operational Overview**:\n• Total Recorded Revenue: **PKR ${totalRevenue.toLocaleString('en-PK')}**\n• Completed Jobs: **${completedCount}**\n• Pending Requests: **${pendingCount}**\n• Low Stock Items: **${lowStockCount}**`;

    return res.json({
      reply: replyText,
      data: { totalRevenue, completedCount, pendingCount, lowStockCount },
    });
  }

  // Default response
  const helpText = `I am your FleetOS AI Operations Copilot. How can I help you today?\n\n**Try asking:**\n• *"Which technicians are overloaded today?"*\n• *"Who should handle the latest pending booking?"*\n• *"Assign top candidate to pending booking"*\n• *"Summarize today's revenue and stats"*`;
  return res.json({ reply: helpText, data: null });
};

exports.executeCopilotAction = async (req, res) => {
  const companyId = req.company._id;
  const { actionType, bookingId, technicianId } = req.body;

  if (actionType === 'CONFIRM_ASSIGNMENT' || actionType === 'ASSIGN_RECOMMENDATION') {
    const booking = await Booking.findOne({ _id: bookingId, company: companyId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const technician = await Technician.findOne({ _id: technicianId, company: companyId });
    if (!technician) return res.status(404).json({ message: 'Technician not found' });

    technician.status = 'On Job';
    await technician.save();

    booking.technician = technician._id;
    booking.status = 'Assigned';
    booking.statusHistory.push({
      status: 'Assigned',
      at: new Date(),
      byRole: 'company',
      note: `Assigned via AI Copilot to ${technician.name}`,
    });
    await booking.save();

    const populated = await booking.populate('technician', 'name status phone avatar rating');
    broadcastBooking(populated, 'booking:updated');

    return res.json({
      success: true,
      message: `Successfully assigned ${technician.name} to booking ${booking.reference}.`,
      booking: populated,
    });
  }

  return res.status(400).json({ message: 'Invalid action type' });
};

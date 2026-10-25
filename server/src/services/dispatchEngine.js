const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const { coordsForLocation, offsetCoords, calculateDistanceKm } = require('../utils/geo');

function calculateSkillMatch(technician, serviceSnapshot) {
  if (!serviceSnapshot || !serviceSnapshot.name) return 80;
  const serviceName = String(serviceSnapshot.name).toLowerCase();
  const serviceCategory = String(serviceSnapshot.category || '').toLowerCase();
  const techRole = String(technician.role || '').toLowerCase();
  const techSkills = Array.isArray(technician.skills)
    ? technician.skills.map((s) => String(s).toLowerCase())
    : [];

  // Check exact skill matches
  if (techSkills.some((skill) => serviceName.includes(skill) || skill.includes(serviceName) || serviceCategory.includes(skill))) {
    return 98;
  }
  // Check role match
  if (techRole.includes(serviceCategory) || serviceCategory.includes(techRole) || techRole.includes('specialist') || techRole.includes('lead')) {
    return 90;
  }
  return 75;
}

function calculateWorkloadLevel(activeJobs) {
  if (activeJobs === 0) return { score: 100, label: 'Low' };
  if (activeJobs === 1) return { score: 80, label: 'Moderate' };
  if (activeJobs === 2) return { score: 50, label: 'High' };
  return { score: 20, label: 'Critical' };
}

function scoreTechnician(technician, booking, activeJobs = 0) {
  const destCoords = coordsForLocation(booking.location);
  const techPoint = technician.currentLocation?.lat && technician.currentLocation?.lng
    ? { lat: technician.currentLocation.lat, lng: technician.currentLocation.lng }
    : offsetCoords(destCoords, 0.02, -0.02);

  const distanceKm = calculateDistanceKm(techPoint, destCoords);
  const etaMinutes = Math.min(Math.max(Math.round(distanceKm * 3.5 + 5), 5), 240);

  const skillMatchScore = calculateSkillMatch(technician, booking.serviceSnapshot);
  const distanceScore = Math.max(10, Math.round(100 - (distanceKm * 6)));
  const workload = calculateWorkloadLevel(activeJobs);
  const ratingScore = Math.round(((technician.rating || 4.0) / 5) * 100);
  const experienceScore = Math.min(100, Math.round(((technician.experienceYears || 1) / 8) * 100));

  const availabilityBonus = technician.status === 'Available' ? 100 : (technician.status === 'On Job' ? 40 : 0);

  const overallScore = Number((
    (skillMatchScore * 0.35) +
    (distanceScore * 0.25) +
    (workload.score * 0.20) +
    (ratingScore * 0.10) +
    (experienceScore * 0.10)
  ).toFixed(1));

  const explanation = `${technician.name} has a ${skillMatchScore}% skill match, is ${distanceKm} km away (~${etaMinutes} min ETA), with ${workload.label.toLowerCase()} workload (${activeJobs} active job${activeJobs === 1 ? '' : 's'}), rated ${technician.rating || 'N/A'}/5.`;

  return {
    technicianId: technician._id,
    techId: technician.techId,
    name: technician.name,
    role: technician.role || 'Specialist',
    phone: technician.phone || '',
    avatar: technician.avatar || '',
    skills: technician.skills || [],
    rating: technician.rating || 0,
    experienceYears: technician.experienceYears || 1,
    status: technician.status,
    activeJobs,
    distanceKm,
    etaMinutes,
    overallScore,
    breakdown: {
      skillMatchScore,
      distanceScore,
      workloadScore: workload.score,
      workloadLevel: workload.label,
      ratingScore,
      experienceScore,
      availabilityBonus,
    },
    explanation,
  };
}

async function rankTechniciansForBooking(bookingId, companyId) {
  const booking = await Booking.findOne({ _id: bookingId, company: companyId });
  if (!booking) throw new Error('Booking not found');

  const technicians = await Technician.find({ company: companyId, status: { $ne: 'Off Duty' } }).lean();
  if (!technicians.length) return [];

  const activeBookings = await Booking.aggregate([
    { $match: { company: companyId, status: { $in: ['Assigned', 'En Route', 'Arrived', 'In Progress'] } } },
    { $group: { _id: '$technician', count: { $sum: 1 } } },
  ]);

  const activeJobMap = activeBookings.reduce((map, item) => {
    if (item._id) map[String(item._id)] = item.count;
    return map;
  }, {});

  const scored = technicians.map((tech) => {
    const activeJobs = activeJobMap[String(tech._id)] || 0;
    return scoreTechnician(tech, booking, activeJobs);
  });

  scored.sort((a, b) => b.overallScore - a.overallScore);
  return scored;
}

module.exports = {
  scoreTechnician,
  rankTechniciansForBooking,
};

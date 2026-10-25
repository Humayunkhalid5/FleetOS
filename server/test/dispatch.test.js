const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreTechnician } = require('../src/services/dispatchEngine');
const Booking = require('../src/models/Booking');
const { calculateDistanceKm } = require('../src/utils/geo');

test('calculateDistanceKm returns accurate haversine distance in km', () => {
  const islamabad = { lat: 33.6844, lng: 73.0479 };
  const rawalpindi = { lat: 33.5651, lng: 73.0169 };
  const dist = calculateDistanceKm(islamabad, rawalpindi);
  assert.ok(dist > 12 && dist < 16, `Distance should be ~13.5km, got ${dist}`);
});

test('scoreTechnician produces explainable score cards', () => {
  const mockTech = {
    _id: 'tech_123',
    techId: 'TECH-1001',
    name: 'Ali Khan',
    role: 'HVAC Specialist',
    skills: ['AC Repair', 'Refrigerator Repair'],
    rating: 4.8,
    experienceYears: 6,
    status: 'Available',
    currentLocation: { lat: 33.6844, lng: 73.0479 },
  };

  const mockBooking = {
    serviceSnapshot: { name: 'AC Repair Service', category: 'HVAC' },
    location: 'Islamabad',
  };

  const result = scoreTechnician(mockTech, mockBooking, 0);

  assert.ok(result.overallScore > 80, `Score should be high, got ${result.overallScore}`);
  assert.equal(result.breakdown.skillMatchScore, 98);
  assert.equal(result.breakdown.workloadLevel, 'Low');
  assert.ok(result.explanation.includes('Ali Khan'));
});

test('Booking lifecycle status list includes terminal state Paid', () => {
  assert.ok(Booking.lifecycle.includes('Completed'));
  assert.ok(Booking.lifecycle.includes('Paid'));
  assert.equal(Booking.lifecycle[Booking.lifecycle.length - 1], 'Cancelled');
});

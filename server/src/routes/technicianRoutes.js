const router = require('express').Router();
const controller = require('../controllers/technicianController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.use('/technicians', protect, requireApprovedCompany);
router.get('/technicians', asyncHandler(controller.getTechnicians));
router.post('/technicians', asyncHandler(controller.createTechnician));
router.put('/technicians/:id', asyncHandler(controller.updateTechnician));
router.delete('/technicians/:id', asyncHandler(controller.deleteTechnician));

module.exports = router;

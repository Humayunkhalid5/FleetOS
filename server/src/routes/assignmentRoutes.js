const express = require('express');
const { assignTechnician } = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.post('/assign-technician', assignTechnician);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getTechnicians, createTechnician, updateTechnician, deleteTechnician } = require('../controllers/technicianController');

router.get('/technicians', getTechnicians);
router.post('/technicians', createTechnician);
router.put('/technicians/:id', updateTechnician);
router.delete('/technicians/:id', deleteTechnician);

module.exports = router;

const router = require('express').Router();
const controller = require('../controllers/inventoryController');
const { protect, requireApprovedCompany } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../utils/http');

router.get('/public/inventory', asyncHandler(controller.getPublicInventory));
router.get('/companies/:companyId/inventory', asyncHandler(controller.getPublicInventory));

router.use('/inventory', protect, requireApprovedCompany);
router.get('/inventory', asyncHandler(controller.getInventory));
router.post('/inventory', asyncHandler(controller.createInventoryItem));
router.put('/inventory/:id', asyncHandler(controller.updateInventoryItem));
router.delete('/inventory/:id', asyncHandler(controller.deleteInventoryItem));

module.exports = router;

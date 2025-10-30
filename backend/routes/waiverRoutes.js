const express = require('express');
const router = express.Router();
const waiverController = require('../controllers/waiverController');

router.post('/', waiverController.createWaiver);
router.get('/customer-info', waiverController.getCustomerInfo);
router.get('/customer-info-by-id', waiverController.getCustomerInfoById);
router.get('/waiver-snapshot', waiverController.getWaiverSnapshot);
router.get('/customer-dashboard', waiverController.getCustomerDashboard);
router.post('/update-customer', waiverController.updateCustomer);
router.post('/save-signature', waiverController.saveSignature);
router.get('/get-signature', waiverController.getSignature);
router.post('/accept-rules', waiverController.acceptRules);
router.get('/getminors', waiverController.getMinors);
router.get('/getAllCustomers', waiverController.getAllCustomers);
router.get('/getallwaivers', waiverController.getAllWaivers);
router.post('/verify/:id', waiverController.verifyWaiver);
router.get('/waiver-details/:id', waiverController.getWaiverDetails);
router.get('/user-history/:phone', waiverController.getUserHistory);
router.get('/rate/:id', waiverController.getRatingInfo);
router.post('/rate/:id', waiverController.saveRating);
router.delete('/:id', waiverController.deleteWaiver);
router.put('/:id/status', waiverController.updateWaiverStatus);

module.exports = router;

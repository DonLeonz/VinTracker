import express from 'express';
import {
  getRecords,
  addVin,
  addRepeatedVin,
  updateVin,
  deleteVin,
  toggleRegistered,
  registerAll,
  unregisterAll,
  deleteAll,
  exportData
} from '../controllers/vinController.js';

const router = express.Router();

// GET routes
router.get('/records', getRecords);
router.get('/export', exportData);

// POST routes
router.post('/add', addVin);
router.post('/add-repeated', addRepeatedVin);
router.post('/update', updateVin);
router.post('/delete', deleteVin);
router.post('/toggle-registered', toggleRegistered);
router.post('/register-all', registerAll);
router.post('/unregister-all', unregisterAll);
router.post('/delete-all', deleteAll);

export default router;

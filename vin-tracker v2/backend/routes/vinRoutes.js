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
  exportData,
  getVerification,
  getDeleted,
  restoreVin,
  restoreAll,
  emptyTrash
} from '../controllers/vinController.js';

const router = express.Router();

// GET routes
router.get('/records', getRecords);
router.get('/export', exportData);
router.get('/verification', getVerification);
router.get('/trash', getDeleted);

// POST routes
router.post('/add', addVin);
router.post('/add-repeated', addRepeatedVin);
router.post('/update', updateVin);
router.post('/delete', deleteVin);
router.post('/toggle-registered', toggleRegistered);
router.post('/register-all', registerAll);
router.post('/unregister-all', unregisterAll);
router.post('/delete-all', deleteAll);

// Trash/Recycle Bin routes
router.post('/restore', restoreVin);
router.post('/restore-all', restoreAll);
router.post('/empty-trash', emptyTrash);

export default router;

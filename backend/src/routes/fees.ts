import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listFeeStructures, createFeeStructure, createFeeStructureValidators,
  updateFeeStructure, deleteFeeStructure,
  listChallans, getChallan, generateChallans, recordPayment, recordPaymentValidators,
  applyWaiver, getFeeSummary,
} from '../controllers/feeController';

const router = Router();
router.use(authenticate);

// Fee structures
router.get('/structures', authorize('fee_management', 'read'), listFeeStructures);
router.post('/structures', authorize('fee_management', 'create'), createFeeStructureValidators, createFeeStructure);
router.put('/structures/:id', authorize('fee_management', 'update'), updateFeeStructure);
router.delete('/structures/:id', authorize('fee_management', 'delete'), deleteFeeStructure);

// Challans
router.get('/challans', authorize('fee_management', 'read'), listChallans);
router.get('/challans/summary', authorize('fee_management', 'read'), getFeeSummary);
router.get('/challans/:id', authorize('fee_management', 'read'), getChallan);
router.post('/challans/generate', authorize('fee_management', 'create'), generateChallans);
router.post('/challans/:id/payment', authorize('fee_management', 'update'), recordPaymentValidators, recordPayment);
router.post('/challans/:id/waiver', authorize('fee_management', 'update'), applyWaiver);

export default router;

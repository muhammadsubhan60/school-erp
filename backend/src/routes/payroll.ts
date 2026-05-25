import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listPayroll, createPayroll, createPayrollValidators,
  updatePayroll, approvePayroll, markPaid,
  bulkProcessPayroll, bulkPayrollValidators,
} from '../controllers/payrollController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('payroll', 'read'), listPayroll);
router.post('/', authorize('payroll', 'create'), createPayrollValidators, createPayroll);
router.post('/bulk', authorize('payroll', 'create'), bulkPayrollValidators, bulkProcessPayroll);
router.put('/:id', authorize('payroll', 'update'), updatePayroll);
router.post('/:id/approve', authorize('payroll', 'approve'), approvePayroll);
router.post('/:id/pay', authorize('payroll', 'approve'), markPaid);

export default router;

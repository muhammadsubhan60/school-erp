import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import {
  getResourceUploadUrl,
  listResources,
  createResource,
  updateResource,
  deleteResource,
  toggleBookmark,
  incrementDownload,
} from '../controllers/resourceController';

const router = Router();
router.use(authenticate);

router.post('/upload-url', getResourceUploadUrl);
router.get('/', listResources);
router.post('/', createResource);
router.put('/:id', updateResource);
router.delete('/:id', deleteResource);
router.post('/:id/bookmark', toggleBookmark);
router.post('/:id/download', incrementDownload);

export default router;

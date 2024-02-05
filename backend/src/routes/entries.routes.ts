import { Router } from 'express';
import {
  listEntries,
  createEntry,
  getEntry,
  updateEntry,
  deleteEntry,
  getStats,
} from '../controllers/entries.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/stats', getStats);
router.get('/', listEntries);
router.post('/', createEntry);
router.get('/:id', getEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry);

export default router;

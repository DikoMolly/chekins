import { Router } from 'express';
import { searchProviders } from '../controllers/searchProviders';

const router = Router();

router.get('/search', searchProviders);

export default router;

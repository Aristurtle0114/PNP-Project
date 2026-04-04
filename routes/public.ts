import { Router } from 'express';
import * as publicController from '../controllers/publicController.js';

const router = Router();

router.get('/', publicController.getHome);
router.get('/report', publicController.getReport);
router.post('/report', publicController.postReport);
router.get('/track', publicController.getTrack);
router.get('/map', publicController.getMap);
router.get('/api/map-points', publicController.getMapPoints);
router.get('/bulletins', publicController.getBulletins);
router.get('/bulletins/:id', publicController.getBulletinDetail);
router.get('/tip', publicController.getTip);
router.post('/tip', publicController.postTip);
router.get('/about', publicController.getAbout);
router.get('/hotlines', publicController.getHotlines);

export default router;

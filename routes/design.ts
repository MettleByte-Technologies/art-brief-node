import express from 'express';
import { generateInitialDesignHandler } from '../src/handlers/generateInitialDesign';
import { getDesignHandler } from '../src/handlers/getDesign';
const router = express.Router();

router.post('/generate-initial-design', generateInitialDesignHandler);
router.get('/design/:id', getDesignHandler);
export default router;

import express from 'express';
import { generateInitialDesignHandler } from '../src/handlers/generateInitialDesign';
import { generateInitialDesignHandler_NEW } from '../src/handlers/generateInitialDesign_NEW';
import { getDesignHandler } from '../src/handlers/getDesign';
import { jsonPlan } from '../src/handlers/jsonplan';
const router = express.Router();

router.post('/generate-initial-design', generateInitialDesignHandler);
router.post('/generate-initial-design-new', generateInitialDesignHandler_NEW);
router.post('/generate-json-plan',express.text({ type: "*/*" }), jsonPlan);
router.get('/design/:id', getDesignHandler);
export default router;

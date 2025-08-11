import express from 'express';
import dotenv from 'dotenv';
import designRoutes from '../routes/design';
import { jsonPlan } from "./handlers/jsonplan";

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', designRoutes);
app.post("/generate-json-plan", express.text({ type: "*/*" }), jsonPlan);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


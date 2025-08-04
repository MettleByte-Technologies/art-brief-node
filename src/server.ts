import express from 'express';
import dotenv from 'dotenv';
import designRoutes from '../routes/design';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', designRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


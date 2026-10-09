import cors from 'cors';
import express from 'express';
import { registerChatRoutes } from './chat-routes';
import { reloadModelConfig } from './model-config-reload-route';

const app = express();
const PORT = process.env.MASTRA_PORT || 4000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/internal/model-config/reload', reloadModelConfig);

registerChatRoutes(app);

app.listen(PORT, () => {
  console.log(`Mastra server running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Stream: POST http://localhost:${PORT}/agent/stream`);
});

export default app;

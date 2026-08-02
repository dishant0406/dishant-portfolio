import type { Express } from 'express';
import { mastra } from '../src/mastra';
import { streamAgentResponse } from './chat-stream-handler';
import { prepareLocalChatResponse } from './local-chat-prepare';

const getAgentMemory = async () => {
  const agent = mastra.getAgent('portfolioAgent');
  return agent.getMemory();
};

export const registerChatRoutes = (app: Express) => {
  app.post('/agent/stream', streamAgentResponse);
  app.post('/agent/prepare-local', prepareLocalChatResponse);

  app.get('/threads/:threadId', async (req, res) => {
    try {
      const { threadId } = req.params;

      if (!threadId) {
        return res.status(400).json({ error: 'Thread ID is required' });
      }

      const memory = await getAgentMemory();
      if (!memory) {
        return res.status(500).json({ error: 'Memory not configured' });
      }

      const thread = await memory.getThreadById({ threadId });
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
      }

      const { uiMessages } = await memory.query({
        threadId,
        selectBy: { last: 100 },
      });

      res.json({ thread, messages: uiMessages });
    } catch (error) {
      console.error('Get thread error:', error);
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });

  app.get('/threads', async (req, res) => {
    try {
      const { resourceId } = req.query;

      if (typeof resourceId !== 'string' || !resourceId) {
        return res.status(400).json({ error: 'resourceId query parameter is required' });
      }

      const memory = await getAgentMemory();
      if (!memory) {
        return res.status(500).json({ error: 'Memory not configured' });
      }

      const threads = await memory.getThreadsByResourceId({ resourceId });
      res.json({ threads: threads || [] });
    } catch (error) {
      console.error('List threads error:', error);
      res.status(500).json({ error: 'Internal server error', details: String(error) });
    }
  });
};

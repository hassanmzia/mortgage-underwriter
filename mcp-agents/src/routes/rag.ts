/**
 * RAG Routes
 */

import { Router, Request, Response } from 'express';
import { queryPolicies, indexPolicy } from '../rag/chromaClient';
import { logger } from '../utils/logger';

export const ragRouter = Router();

// Query policies
ragRouter.post('/query', async (req: Request, res: Response) => {
  try {
    const { query, category, top_k = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await queryPolicies(query, top_k, category);

    res.json({
      query,
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        relevanceScore: 1 - r.distance
      }))
    });
  } catch (error) {
    logger.error('RAG query failed:', error);
    res.status(500).json({ error: 'Failed to query policies' });
  }
});

// Index a policy document
ragRouter.post('/index', async (req: Request, res: Response) => {
  try {
    const { document_id, title, content, category, document_type, metadata } = req.body;

    if (!document_id || !content) {
      return res.status(400).json({ error: 'document_id and content are required' });
    }

    await indexPolicy(document_id, content, {
      title,
      category,
      document_type,
      ...metadata
    });

    res.json({
      status: 'indexed',
      document_id,
      embedding_ids: [document_id]
    });
  } catch (error) {
    logger.error('RAG indexing failed:', error);
    res.status(500).json({ error: 'Failed to index policy' });
  }
});

// Bulk index policies
ragRouter.post('/bulk-index', async (req: Request, res: Response) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents)) {
      return res.status(400).json({ error: 'documents array is required' });
    }

    const results = [];
    for (const doc of documents) {
      await indexPolicy(doc.document_id, doc.content, {
        title: doc.title,
        category: doc.category,
        document_type: doc.document_type,
        ...doc.metadata
      });
      results.push(doc.document_id);
    }

    res.json({
      status: 'indexed',
      count: results.length,
      document_ids: results
    });
  } catch (error) {
    logger.error('Bulk indexing failed:', error);
    res.status(500).json({ error: 'Failed to bulk index policies' });
  }
});

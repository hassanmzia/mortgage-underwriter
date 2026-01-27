/**
 * ChromaDB Client for RAG
 */

import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

let chromaClient: ChromaClient | null = null;
let policyCollection: Collection | null = null;

export async function initializeChromaDB(): Promise<void> {
  chromaClient = new ChromaClient({
    path: `http://${config.chromaHost}:${config.chromaPort}`
  });

  // Test connection
  const heartbeat = await chromaClient.heartbeat();
  logger.info('ChromaDB heartbeat:', heartbeat);

  // Get or create policy collection
  const embeddingFunction = new OpenAIEmbeddingFunction({
    openai_api_key: config.openaiApiKey,
    openai_model: 'text-embedding-3-small'
  });

  policyCollection = await chromaClient.getOrCreateCollection({
    name: config.ragCollectionName,
    embeddingFunction
  });

  logger.info(`Policy collection initialized: ${config.ragCollectionName}`);
}

export function getChromaClient(): ChromaClient {
  if (!chromaClient) {
    throw new Error('ChromaDB not initialized');
  }
  return chromaClient;
}

export function getPolicyCollection(): Collection {
  if (!policyCollection) {
    throw new Error('Policy collection not initialized');
  }
  return policyCollection;
}

export async function queryPolicies(
  query: string,
  topK: number = config.ragTopK,
  category?: string
): Promise<PolicyQueryResult[]> {
  const collection = getPolicyCollection();

  const whereClause = category ? { category: category } : undefined;

  const results = await collection.query({
    queryTexts: [query],
    nResults: topK,
    where: whereClause
  });

  const documents: PolicyQueryResult[] = [];

  if (results.documents && results.documents[0]) {
    for (let i = 0; i < results.documents[0].length; i++) {
      documents.push({
        id: results.ids[0][i],
        content: results.documents[0][i] || '',
        metadata: results.metadatas?.[0]?.[i] || {},
        distance: results.distances?.[0]?.[i] || 0
      });
    }
  }

  return documents;
}

export async function indexPolicy(
  id: string,
  content: string,
  metadata: Record<string, any>
): Promise<void> {
  const collection = getPolicyCollection();

  await collection.upsert({
    ids: [id],
    documents: [content],
    metadatas: [metadata]
  });

  logger.info(`Policy indexed: ${id}`);
}

export interface PolicyQueryResult {
  id: string;
  content: string;
  metadata: Record<string, any>;
  distance: number;
}

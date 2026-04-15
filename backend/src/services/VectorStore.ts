import prisma from '../lib/prisma';
import crypto from 'crypto';

export class VectorStore {
  private static instance: VectorStore;
  private extractor: any;

  private constructor() {}

  /**
   * Singleton pattern for VectorStore to avoid reloading the model on every call.
   */
  static async getInstance() {
    if (!VectorStore.instance) {
      // Use new Function trick to prevent ts-node from transpiling import() to require()
      const { pipeline } = await (new Function('return import("@xenova/transformers")'))();
      VectorStore.instance = new VectorStore();
      // Using a very lightweight and fast model: all-MiniLM-L6-v2 (384 dimensions)
      VectorStore.instance.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return VectorStore.instance;
  }

  /**
   * Generates an embedding for the given text.
   */
  async getEmbedding(text: string): Promise<number[]> {
    const output = await this.extractor(text, { pooling: 'mean', normalize: true });
    // Handle cross-platform tensor types (Float32Array)
    return Array.from(output.data);
  }

  /**
   * Saves a new knowledge entry with its embedding.
   */
  async addKnowledge(content: string, metadata: any = {}) {
    try {
      const embedding = await this.getEmbedding(content);
      const vector = `[${embedding.join(',')}]`;

      // Use Prisma's $executeRaw for direct SQL insertion with pgvector casting
      await prisma.$executeRawUnsafe(
        `INSERT INTO knowledge_base (id, content, embedding, metadata) 
         VALUES ($1, $2, $3::vector, $4::jsonb)`,
        crypto.randomUUID(),
        content,
        vector,
        JSON.stringify(metadata)
      );
    } catch (error) {
      console.error('Error adding knowledge:', error);
      throw error;
    }
  }

  /**
   * Performs a cosine similarity search on the knowledge base.
   */
  async search(query: string, limit: number = 3) {
    try {
      const embedding = await this.getEmbedding(query);
      const vectorString = `[${embedding.join(',')}]`;

      // Using the <=> operator for cosine distance (1 - similarity)
      // We use $queryRawUnsafe because $queryRaw with template tags sometimes 
      // struggles with the combination of vectors and casting.
      const results: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, content, metadata, (embedding <=> $1::vector) as distance
         FROM knowledge_base
         ORDER BY distance ASC
         LIMIT $2`,
        vectorString,
        limit
      );

      return results;
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return [];
    }
  }
}

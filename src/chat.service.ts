import { Injectable } from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { DynamoDBChatMessageHistory } from '@langchain/community/stores/message/dynamodb';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { Prisma, PrismaClient, ChatDocument } from '@prisma/client';
import { prompt as systemPrompt } from './prompt';

@Injectable()
export class ChatService {
  async chat(message: string, sessionId: string): Promise<any> {
    const llm = new ChatOpenAI({
      model: 'gpt-3.5-turbo',
      temperature: 0,
    });

    await this.classifyQuestion(message);

    // TODO: load from database (agent)
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    // TODO: Load the retriever from a vector database Postgres (pgvector)
    const retriever = await this.getRetriever(sessionId);

    const questionAnswerChain = await createStuffDocumentsChain({
      llm,
      prompt,
    });

    const ragChain = await createRetrievalChain({
      retriever,
      combineDocsChain: questionAnswerChain,
    });

    const conversationalRagChain = new RunnableWithMessageHistory({
      runnable: ragChain,
      getMessageHistory: async (sessionId) => {
        return this.createChatHistory(sessionId);
      },
      inputMessagesKey: 'input',
      historyMessagesKey: 'chat_history',
      outputMessagesKey: 'answer',
    });

    const response = await conversationalRagChain.invoke(
      {
        input: message,
      },
      { configurable: { sessionId } },
    );

    return response.answer;
  }

  private async createChatHistory(
    sessionId: string,
  ): Promise<BaseChatMessageHistory> {
    const dynamo = new DynamoDBChatMessageHistory({
      tableName: 'data_insights_message',
      partitionKey: 'id',
      sessionId, // Or some other unique identifier for the conversation
    });

    return dynamo;
  }

  public async getRetriever(originId?: string): Promise<any> {
    // Consigo pegar do service em commons
    const db = new PrismaClient();

    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
    });

    // Use the `withModel` method to get proper type hints for `metadata` field:
    const vectorStore = PrismaVectorStore.withModel<ChatDocument>(db).create(
      embeddings,
      {
        prisma: Prisma,
        tableName: 'ChatDocument',
        vectorColumnName: 'vector',
        columns: {
          id: PrismaVectorStore.IdColumn,
          content: PrismaVectorStore.ContentColumn,
          // origin_id: true,
          // company_id: true,
        },
        // filter: { origin_id: { equals: 'default' } },
      },
    );

    const data = vectorStore.asRetriever({
      // filter: { origin_id: { equals: originId } },
    });

    const test = await data.invoke('equipes');
    console.log(test);

    return data;
  }

  private async classifyQuestion(question: string): Promise<string> {
    const llm = new ChatOpenAI({
      model: 'gpt-3.5-turbo',
      temperature: 0,
    });

    const prompt = `Classify the following question as "specific" or "general" based on whether it refers to a single interview or multiple interviews:\n\nQuestion: "${question}"\n\nAnswer only "specific" or "general".`;

    const response = await llm.invoke(prompt);
    console.log(response.content);
    return response.content as string;
  }
}

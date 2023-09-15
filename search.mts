import { Embedding, Prisma, PrismaClient } from "@prisma/client";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PrismaVectorStore } from "langchain/vectorstores/prisma";

const prisma = new PrismaClient();
const vectorStore = PrismaVectorStore.withModel<Embedding>(prisma).create(
  new OpenAIEmbeddings(),
  {
    prisma: Prisma,
    tableName: "Embedding",
    vectorColumnName: "vector",
    columns: {
      id: PrismaVectorStore.IdColumn,
      content: PrismaVectorStore.ContentColumn,
    },
  }
);

const args = process.argv.slice(2);

const searchText = args.join(' ');

console.log("searchText", searchText)

const result = await vectorStore.similaritySearch(searchText, 5)
console.log({ metadata: result.map(it => it.metadata) })
const embeddingIds: number[] = result.map((result) =>
  result.metadata.id
);

// 取得できた
const embeddingRecords = await prisma.embedding.findMany({ where: { id: { in: embeddingIds } }, include: { memo: true } });

// 類似度の高い順に並べたメモを取得する
const memosOrderedByRelatedness = embeddingIds.map((id) => embeddingRecords.find((record) => record.id === id)?.memo);

console.log({ memosOrderedByRelatedness })

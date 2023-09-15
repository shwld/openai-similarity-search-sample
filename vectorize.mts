import { PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

const prisma = new PrismaClient();

const memos = await prisma.memo.findMany();

const openAIEmbeddings = new OpenAIEmbeddings();

memos.forEach(async (memo) => {
  // OpenAIのEmbedding APIに送れるトークン数に制限があるので、適当な長さで区切ります
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 20,
  });
  const documents = await splitter.createDocuments([memo.content]);
  const contents: string[] = documents.map(({ pageContent }) => pageContent);

  // 分割したテキストと、テキストのembeddingを紐付ける
  await Promise.all(
    contents.map(async (content) => {
      const vector = await openAIEmbeddings.embedDocuments([content])
      console.log({ content })
      return prisma.$executeRaw`
                        INSERT INTO "Embedding" (
                            "id",
                            "content",
                            "memoId",
                            "vector"
                        )
                        VALUES (
                            DEFAULT,
                            ${content},
                            ${memo.id},
                            ${`[
                                ${vector.join(",")}
                                ]`}::vector
                        )`
    })
  );
});

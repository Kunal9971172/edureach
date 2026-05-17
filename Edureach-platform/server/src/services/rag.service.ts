import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoClient } from "mongodb";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { pipeline } from "@xenova/transformers";

console.log("RAG Service Loaded with Sarvam AI!");

// ---- __dirname for ESM ----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Local Embedding Model (Free, No API Key, Indian Language Friendly) ----
let embedder: any = null;
const getEmbeddings = async (text: string): Promise<number[]> => {
    if (!embedder) {
        embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }
    const output = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
};

// --- Initialize Knowledge Base ---
export const initializeKnowledgeBase = async (): Promise<void> => {
    const client = new MongoClient(process.env.MONGODB_URI || "");
    try {
        await client.connect();
        const collection = client.db("edureach").collection("knowledge_docs");

        // Check if we need to re-index (e.g. if we switched from Gemini to Local)
        const docWithEmbedding = await collection.findOne({ embedding: { $exists: true } });
        
        // Gemini embeddings are 3072 dimensions, MiniLM is 384.
        // If we see a mismatch, we MUST re-index.
        if (docWithEmbedding && docWithEmbedding.embedding.length === 384) {
            const count = await collection.countDocuments();
            console.log(` Knowledge base ready (${count} chunks using Sarvam/Local stack)`);
            return;
        }

        console.log(" Re-indexing knowledge base for Sarvam AI Stack (384 dimensions)...");
        await collection.deleteMany({}); // Clear old Gemini embeddings

        const filePath = path.join(__dirname, "../../knowledge-base/edureach-knowledge.txt");
        const loader = new TextLoader(filePath);
        const docs = await loader.load();
        
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 800,
            chunkOverlap: 100,
        });
        const allSplits = await splitter.splitDocuments(docs);

        console.log(` Generating embeddings for ${allSplits.length} chunks...`);
        const docsToInsert = [];
        for (const split of allSplits) {
            const embedding = await getEmbeddings(split.pageContent);
            docsToInsert.push({
                text: split.pageContent,
                embedding,
                metadata: split.metadata,
                createdAt: new Date(),
                provider: "sarvam-local"
            });
        }

        await collection.insertMany(docsToInsert);
        console.log(` Successfully indexed ${docsToInsert.length} chunks.`);
    } catch (error) {
        console.error(" Initialization Error:", error);
    } finally {
        await client.close();
    }
};

// --- Get RAG Response via Sarvam AI ---
export const getRAGResponse = async (question: string, isVoice: boolean = false): Promise<string> => {
    console.log("Starting Sarvam RAG process for:", question, "isVoice:", isVoice);
    const client = new MongoClient(process.env.MONGODB_URI || "");
    
    try {
        await client.connect();
        const collection = client.db("edureach").collection("knowledge_docs");

        // 1. Generate local embedding
        const queryVector = await getEmbeddings(question);

        // 2. Vector Search in Atlas
        const pipeline = [
            {
                $vectorSearch: {
                    index: "edureachvectorindex",
                    path: "embedding",
                    queryVector: queryVector,
                    numCandidates: 10,
                    limit: 3
                }
            },
            {
                $project: {
                    text: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];

        const retrievedDocs = await collection.aggregate(pipeline).toArray();
        const context = retrievedDocs.map((doc: any) => doc.text).join("\n\n");

        // 3. Generate Answer using Sarvam AI
        const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
        
        let systemPrompt = `You are EduReach Bot, a premium AI counselor for EduReach College. 
Your goal is to provide beautifully structured, easy-to-read answers.
Follow these rules:
1. Use **Bold Headers** for different sections.
2. Use bullet points for lists.
3. Use proper spacing between sections.
4. Keep the tone professional but warm.
5. If info is missing, say: 'I don't have that information right now. Click Talk to Us to speak with a counselor.'
6. Do not use too many emojis, keep it elegant.`;

        if (isVoice) {
            systemPrompt = `You are Alex, a premium AI voice counselor for EduReach College. 
You are speaking directly to a student. Provide conversational, friendly, and brief answers.
CRITICAL RULES FOR VOICE:
1. DO NOT use any markdown formatting (no asterisks, no hashes, no bullet points).
2. Write in plain text exactly as it should be spoken out loud.
3. Keep answers concise (max 2-3 short sentences).
4. If you don't know the answer, say: 'I am not sure about that, but our admission counselors can help you.'
5. DO NOT say 'I don't have that information right now' for simple greetings like 'Hi' or 'How are you'. Just greet them back.`;
        }

        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SARVAM_API_KEY || ""}`
            },
            body: JSON.stringify({
                model: "sarvam-105b",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: `CONTEXT:\n${context || "No relevant info found."}\n\nQUESTION: ${question}`
                    }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Sarvam AI Error: ${JSON.stringify(err)}`);
        }

        const data: any = await response.json();
        return data.choices[0].message.content;

    } catch (error: any) {
        console.error(" Sarvam RAG Service Error:", error);
        return "I'm having trouble right now. Please check your MongoDB Atlas connection.";
    } finally {
        await client.close();
    }
};

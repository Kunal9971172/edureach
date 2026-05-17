import { GoogleGenerativeAI } from "@google/generative-ai";

const run = async () => {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
    const models = await genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Gemini Pro Model Object created.");
    
    try {
        const result = await models.generateContent("test");
        console.log("Gemini Pro works!");
    } catch (e) {
        const error = e as Error;
        console.error("Gemini Pro failed:", error.message);
    }
};

run().catch(console.error);

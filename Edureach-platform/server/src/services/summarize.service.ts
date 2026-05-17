import User from "../models/user.model.ts";

export const autoSummarizeUserChat = async (userId: string) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.messages || user.messages.length === 0) return;

        // Prepare context
        const conversationText = user.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
        const prompt = `Summarize the following chat between a student and a college counselor AI bot. Extract key interests, concerns, requested courses, and intent. Keep it concise (3-4 bullet points).\n\nChat:\n${conversationText}`;

        const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SARVAM_API_KEY || ""}`
            },
            body: JSON.stringify({
                model: "sarvam-105b",
                messages: [
                    { role: "system", content: "You are a summarization assistant for an admission counselor. Provide a professional, very brief summary in bullet points." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (response.ok) {
            const data: any = await response.json();
            const summary = data.choices[0].message.content;
            await User.findByIdAndUpdate(userId, { chatSummary: summary });
        }
    } catch (error) {
        console.error("Auto summarization failed:", error);
    }
};

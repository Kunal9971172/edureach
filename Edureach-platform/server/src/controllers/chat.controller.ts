import type { Request, Response, NextFunction } from "express";
import { getRAGResponse } from "../services/rag.service.ts";
import User from "../models/user.model.ts";
import { autoSummarizeUserChat } from "../services/summarize.service.ts";

// POST /api/chat/message
export const sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { message, isVoice } = req.body;
        if (!message || typeof message !== "string" || !message.trim()) {
            res.status(400).json({ success: false, message: "Message is required." });
            return;
        }

        console.log("Chat Controller: Received message:", message, "isVoice:", isVoice);
        const answer = await getRAGResponse(message.trim(), Boolean(isVoice));
        console.log("Chat Controller: Got answer.");

        if (req.user && req.user.userId) {
            await User.findByIdAndUpdate(req.user.userId, {
                $push: {
                    messages: {
                        $each: [
                            { role: "user", content: message.trim() },
                            { role: "bot", content: answer }
                        ]
                    }
                }
            });
            // Update summary asynchronously
            autoSummarizeUserChat(req.user.userId);
        }

        res.json({ success: true, data: { message: answer } });
    } catch (error) { next(error); }
};

// POST /api/chat/audio
export const processAudioMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { audioBase64 } = req.body;
        if (!audioBase64) {
            res.status(400).json({ success: false, message: "Audio data is required." });
            return;
        }

        const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
        const base64Data = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('file', blob, 'audio.webm');
        
        console.log("Chat Controller: Processing audio message via Sarvam STT...");
        const sttResponse = await fetch("https://api.sarvam.ai/speech-to-text-translate", {
            method: "POST",
            headers: {
                "api-subscription-key": SARVAM_API_KEY || ""
            },
            body: formData
        });

        if (!sttResponse.ok) {
            const err = await sttResponse.json().catch(() => ({}));
            throw new Error(`Sarvam STT Error: ${JSON.stringify(err)}`);
        }

        const sttData: any = await sttResponse.json();
        const transcribedText = sttData.transcript || "";
        
        console.log("Chat Controller: Transcribed text:", transcribedText);
        
        if (!transcribedText.trim()) {
            res.json({ success: true, data: { message: "Sorry, I couldn't understand the audio.", transcribed: "" } });
            return;
        }
        
        const answer = await getRAGResponse(transcribedText.trim(), false);

        if (req.user && req.user.userId) {
            await User.findByIdAndUpdate(req.user.userId, {
                $push: {
                    messages: {
                        $each: [
                            { role: "user", content: transcribedText.trim() },
                            { role: "bot", content: answer }
                        ]
                    }
                }
            });
            // Update summary asynchronously
            autoSummarizeUserChat(req.user.userId);
        }
        
        res.json({ success: true, data: { message: answer, transcribed: transcribedText } });
    } catch (error) { next(error); }
};

const languageMap: { [key: string]: string } = {
    hi: "Hindi",
    mr: "Marathi",
    te: "Telugu",
    ta: "Tamil",
    kn: "Kannada",
    gu: "Gujarati",
    bn: "Bengali",
    ml: "Malayalam",
    pa: "Punjabi",
    en: "English"
};

// POST /api/chat/translate
export const translateText = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { text, targetLanguage } = req.body;
        if (!text || !targetLanguage) {
            res.status(400).json({ success: false, message: "Text and targetLanguage are required." });
            return;
        }

        const langName = languageMap[targetLanguage] || targetLanguage;
        if (targetLanguage === "en") {
            res.json({ success: true, data: { translatedText: text } });
            return;
        }

        const SARVAM_API_KEY = process.env.SARVAM_API_KEY;
        const prompt = `Translate the following English text into ${langName}. Preserve all original Markdown tags, headers, bullet points, numbers, bold markers, and formatting. Do not add any conversational responses, notes, explanations, meta-commentary, or introductory phrases. Return ONLY the direct translation.

Text to translate:
${text}`;

        console.log(`Chat Controller: Translating text to ${langName}...`);
        const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SARVAM_API_KEY || ""}`
            },
            body: JSON.stringify({
                model: "sarvam-105b",
                messages: [
                    { role: "system", content: "You are a precise, literal translation assistant. Translate the text accurately to the target Indian language while strictly preserving all markdown syntax." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Sarvam Translation Error: ${JSON.stringify(err)}`);
        }

        const data: any = await response.json();
        const translatedText = data.choices?.[0]?.message?.content || "";
        console.log(`Chat Controller: Translation successful.`);

        res.json({ success: true, data: { translatedText: translatedText.trim() } });
    } catch (error) { next(error); }
};
import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, User, Minus, Mic, Square } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { sendMessage, sendAudioMessage, translateMessage } from "../services/chat.service";
import ReactMarkdown from "react-markdown";

interface Message {
    id: number;
    text: string;
    sender: "user" | "bot";
    originalText?: string;
    translations?: { [lang: string]: string };
    activeLang?: string;
    translating?: boolean;
}

interface ChatDrawerProps {
    open: boolean;
    onClose: () => void;
}

const quickQuestions = [
    "What courses do you offer?",
    "Tell me about placements",
    "What is the fee structure?",
    "How to apply for admissions?",
];

export default function ChatDrawer({ open, onClose }: ChatDrawerProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
            sender: "bot",
            originalText: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`,
            translations: {
                en: `Hi ${user?.name?.split(" ")[0] || "there"}! I'm EduReach Bot. Ask me anything about courses, fees, admissions, or campus life.`
            },
            activeLang: "en"
        },
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const [loadingText, setLoadingText] = useState("Thinking...");
    const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!sending) return;
        const texts = ["Thinking...", "Making personalised answers for you...", "Finalizing the results..."];
        let i = 0;
        setLoadingText(texts[0]);
        
        const interval = setInterval(() => {
            i = (i + 1) % texts.length;
            setLoadingText(texts[i]);
        }, 1500);

        return () => clearInterval(interval);
    }, [sending]);

    const stopRecordingCleanup = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
    };

    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            // Setup silence detection
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const checkAudioLevel = () => {
                if (mediaRecorder.state !== 'recording') return;
                
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                
                // If sound detected above threshold, reset timeout
                if (average > 10) {
                    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                    silenceTimeoutRef.current = setTimeout(() => {
                        if (mediaRecorderRef.current?.state === 'recording') {
                            mediaRecorderRef.current.stop();
                        }
                    }, 4000);
                }
                
                animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
            };

            // Start initial 4s timeout in case they never speak
            silenceTimeoutRef.current = setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 4000);
            
            checkAudioLevel();

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stopRecordingCleanup();
                setIsRecording(false);
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    setSending(true);
                    
                    const tempMsg: Message = { id: Date.now(), text: "🎤 Processing audio...", sender: "user" };
                    setMessages(prev => [...prev, tempMsg]);

                    try {
                        const data = await sendAudioMessage(base64Audio);
                        
                        setMessages(prev => prev.map(msg => 
                            msg.id === tempMsg.id ? { ...msg, text: data.transcribed || "🎤 Audio input" } : msg
                        ));

                        const botMsg: Message = {
                            id: Date.now() + 1,
                            text: data.message,
                            sender: "bot",
                            originalText: data.message,
                            translations: { en: data.message },
                            activeLang: "en"
                        };
                        setMessages((prev) => [...prev, botMsg]);
                    } catch {
                        const errorMsg: Message = { id: Date.now() + 1, text: "Sorry, I couldn't process the audio. Please try again.", sender: "bot" };
                        setMessages((prev) => [...prev, errorMsg]);
                    } finally {
                        setSending(false);
                    }
                };
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Please enable microphone permissions to use voice chat.");
        }
    };

    const handleSend = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || sending) return;

        const userMsg: Message = { id: Date.now(), text: messageText, sender: "user" };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setSending(true);

        try {
            // sendMessage now returns { message: "answer text" }
            const data = await sendMessage(messageText);
            const botMsg: Message = {
                id: Date.now() + 1,
                text: data.message,
                sender: "bot",
                originalText: data.message,
                translations: { en: data.message },
                activeLang: "en"
            };
            setMessages((prev) => [...prev, botMsg]);
        } catch {
            const errorMsg: Message = { id: Date.now() + 1, text: "Sorry, something went wrong. Please try again.", sender: "bot" };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setSending(false);
        }
    };

    const handleTranslateMessage = async (msgId: number, targetLang: string) => {
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;

        if (msg.activeLang === targetLang) return;

        if (targetLang === "en") {
            setMessages(prev => prev.map(m => 
                m.id === msgId 
                    ? { ...m, text: m.originalText || m.text, activeLang: "en" } 
                    : m
            ));
            return;
        }

        if (msg.translations && msg.translations[targetLang]) {
            setMessages(prev => prev.map(m => 
                m.id === msgId 
                    ? { ...m, text: m.translations![targetLang], activeLang: targetLang } 
                    : m
            ));
            return;
        }

        setMessages(prev => prev.map(m => 
            m.id === msgId ? { ...m, translating: true } : m
        ));

        try {
            const textToTranslate = msg.originalText || msg.text;
            const data = await translateMessage(textToTranslate, targetLang);
            
            setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                    const newTranslations = { ...m.translations, [targetLang]: data.translatedText };
                    return {
                        ...m,
                        text: data.translatedText,
                        translations: newTranslations,
                        activeLang: targetLang,
                        translating: false
                    };
                }
                return m;
            }));
        } catch (error) {
            console.error("Translation failed:", error);
            setMessages(prev => prev.map(m => 
                m.id === msgId ? { ...m, translating: false } : m
            ));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!open) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-maroon px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm">EduReach Bot</h3>
                        <p className="text-white/70 text-xs">Ask me anything</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition-colors duration-200">
                        <Minus className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="text-white/70 hover:text-white p-1 transition-colors duration-200">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.sender === "bot" && (
                            <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center flex-shrink-0 mb-6">
                                <Bot className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className="flex flex-col gap-1 max-w-[80%]">
                            <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${msg.sender === "user"
                                    ? "bg-maroon text-white rounded-br-sm shadow-md"
                                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm"
                                }`}>
                                {msg.sender === "bot" ? (
                                    msg.translating ? (
                                        <div className="flex items-center gap-2 text-gray-400 py-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                            <span className="text-xs">Translating...</span>
                                        </div>
                                    ) : (
                                        <div className="markdown-content">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    )
                                ) : (
                                    msg.text
                                )}
                            </div>
                            
                            {/* Translate Selector for Bot Messages */}
                            {msg.sender === "bot" && (
                                <div className="flex items-center gap-1.5 self-start ml-1 mt-0.5">
                                    <span className="text-[10px] text-gray-400">Translate:</span>
                                    <select 
                                        value={msg.activeLang || "en"}
                                        onChange={(e) => handleTranslateMessage(msg.id, e.target.value)}
                                        disabled={msg.translating}
                                        className="text-[10px] bg-white border border-gray-200 text-gray-600 rounded px-1 py-0.5 focus:outline-none focus:border-maroon cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <option value="en">English</option>
                                        <option value="hi">Hindi (हिन्दी)</option>
                                        <option value="mr">Marathi (मराठी)</option>
                                        <option value="te">Telugu (తెలుగు)</option>
                                        <option value="ta">Tamil (தமிழ்)</option>
                                        <option value="kn">Kannada (ಕನ್ನಡ)</option>
                                        <option value="gu">Gujarati (ગુજરાતી)</option>
                                        <option value="bn">Bengali (বাংলা)</option>
                                        <option value="ml">Malayalam (മലയാളം)</option>
                                        <option value="pa">Punjabi (ਪੰਜਾਬੀ)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        {msg.sender === "user" && (
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-3 h-3 text-gray-600" />
                            </div>
                        )}
                    </div>
                ))}

                {sending && (
                    <div className="flex items-end gap-2">
                        <div className="w-6 h-6 bg-maroon rounded-full flex items-center justify-center">
                            <Bot className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-3">
                            <span className="text-sm text-gray-600 font-medium animate-pulse">
                                {loadingText}
                            </span>
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.2s]" />
                                <span className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick questions */}
            {messages.length === 1 && (
                <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickQuestions.map((q) => (
                            <button key={q} onClick={() => handleSend(q)}
                                className="text-xs px-2.5 py-1 bg-white border border-maroon/20 text-maroon rounded-full hover:bg-maroon hover:text-white transition-colors duration-200">
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="bg-white border-t border-gray-200 p-3">
                <div className="flex items-center gap-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                        placeholder={isRecording ? "Listening..." : "Ask a question..."} disabled={sending || isRecording}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-maroon text-sm disabled:opacity-50 transition-colors duration-200" />
                    <button onClick={toggleRecording} disabled={sending}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {isRecording ? <Square className="w-4 h-4" fill="currentColor" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleSend()} disabled={!input.trim() || sending || isRecording}
                        className="w-9 h-9 bg-maroon text-white rounded-lg flex items-center justify-center hover:bg-maroon-dark disabled:opacity-50 transition-colors duration-200">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
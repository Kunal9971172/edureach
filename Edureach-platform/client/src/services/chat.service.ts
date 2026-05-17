import API from "./api";

// Backend response: { success: true, data: { message: "answer text" } }
export const sendMessage = async (message: string, isVoice: boolean = false) => {
  const res = await API.post("/chat/message", { message, isVoice });
  return res.data.data; // { message: "answer text" }
};

export const sendAudioMessage = async (audioBase64: string) => {
  const res = await API.post("/chat/audio", { audioBase64 });
  return res.data.data; // { message: "answer text", transcribed: "transcribed text" }
};

export const translateMessage = async (text: string, targetLanguage: string) => {
  const res = await API.post("/chat/translate", { text, targetLanguage });
  return res.data.data; // { translatedText: "translated text" }
};
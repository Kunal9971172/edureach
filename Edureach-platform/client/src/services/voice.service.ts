import axios from "axios";

const API_URL = "http://localhost:8787/api/voice";

export const getTTSAudio = async (text: string, language: string = "en-IN"): Promise<string[]> => {
    const response = await axios.post(`${API_URL}/tts`, { text, language });
    return response.data.audios || []; // array of base64 strings
};

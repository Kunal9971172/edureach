import API from "./api";

export const getTTSAudio = async (text: string, language: string = "en-IN"): Promise<string[]> => {
    const response = await API.post("/voice/tts", { text, language });
    return response.data.audios || []; // array of base64 strings
};

// ============================================
// PURPOSE: Handle Vapi API calls for outbound calling
// ============================================

interface CallPayload {
  phoneNumber: string;
  userName: string;
  userEmail: string;
  preferredCourse?: string;
  queryTopic?: string;
}

interface VapiCallResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

export const initiateOutboundCall = async (payload: CallPayload): Promise<VapiCallResponse> => {
  const { phoneNumber, userName, userEmail, preferredCourse, queryTopic } = payload;

  const VAPI_API_KEY = process.env.VAPI_API_KEY;
  const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
  const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

  if (!VAPI_API_KEY || !VAPI_ASSISTANT_ID) {
    throw new Error("Vapi configuration missing. Check VAPI_API_KEY and VAPI_ASSISTANT_ID in .env");
  }

  // Format phone number — remove any non-digit characters except +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
  const formattedPhone = cleanNumber.startsWith("+") ? cleanNumber : `+91${cleanNumber.replace(/^0+/, "")}`;

  console.log(`Initiating REAL phone call for ${formattedPhone}...`);

  const requestBody: any = {
    assistantId: VAPI_ASSISTANT_ID,
    assistantOverrides: {
      firstMessage: `Hi ${userName}, this is Ava from EduReach College. I'm calling to help you with information about ${preferredCourse || "our programs"}. Do you have a quick moment?`,
      variableValues: {
        studentName: userName,
        studentEmail: userEmail,
        preferredCourse: preferredCourse || "Not specified",
        queryTopic: queryTopic || "General inquiry",
      },
    },
    customer: {
      number: formattedPhone,
      name: userName,
    },
  };

  // Only include phoneNumberId if it's explicitly provided and seems valid
  // If we omit it, Vapi tries to use its own pool (better for international/India)
  if (VAPI_PHONE_NUMBER_ID && VAPI_PHONE_NUMBER_ID.length > 10) {
    requestBody.phoneNumberId = VAPI_PHONE_NUMBER_ID;
  }

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Vapi API Error Response:", data);
    const errorMsg = data.message || JSON.stringify(data);
    throw new Error(`Vapi API Error: ${errorMsg}`);
  }

  return data as VapiCallResponse;
};
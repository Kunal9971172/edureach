import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { googleLogin } from "../services/auth.service";
import toast from "react-hot-toast";

export default function GoogleAuthButton() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [googleData, setGoogleData] = useState<{
    credential?: string;
    isMock?: boolean;
    mockData?: { email: string; name: string };
  } | null>(null);
  
  const [showMockPanel, setShowMockPanel] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  // Initialize native Google Sign In
  useEffect(() => {
    // Try to load native Google SDK if window.google is ready
    if (typeof window !== "undefined" && (window as any).google) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Placeholder
          callback: (response: any) => {
            handleGoogleSuccess(response.credential);
          },
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("google-signin-element"),
          { theme: "outline", size: "large", width: "100%" }
        );
      } catch (e) {
        console.warn("Google GIS initialization failed:", e);
      }
    }
  }, []);

  const handleGoogleSuccess = async (credential: string) => {
    try {
      const res = await googleLogin({ credential });
      if (res.requiresPhone) {
        setGoogleData({ credential });
        setShowPhoneModal(true);
      } else if (res.success) {
        login(res.data.token);
        toast.success(`Welcome back, ${res.data.user.name}!`);
        if (res.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Google authentication failed.");
    }
  };

  const handleMockSelect = async (name: string, email: string) => {
    const mockData = { name, email };
    try {
      const res = await googleLogin({ isMock: true, mockData });
      if (res.requiresPhone) {
        setGoogleData({ isMock: true, mockData });
        setShowMockPanel(false);
        setShowPhoneModal(true);
      } else if (res.success) {
        login(res.data.token);
        toast.success(`Logged in as ${name} (Mock)`);
        setShowMockPanel(false);
        if (res.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Mock login failed.");
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    if (!googleData) return;

    try {
      const res = await googleLogin({
        ...googleData,
        phone,
      });

      if (res.success) {
        login(res.data.token);
        toast.success(`Registration complete! Welcome ${res.data.user.name}.`);
        setShowPhoneModal(false);
        if (res.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete registration.");
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Native Sign In Container (Hidden by default unless CLIENT_ID is set up) */}
      <div id="google-signin-element" className="w-full hidden"></div>

      {/* Styled Google Auth Button (Acts as Mock & Manual Google click trigger) */}
      <button
        type="button"
        onClick={() => setShowMockPanel(true)}
        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all duration-200"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.842 1.096 15.105 0 12 0 7.354 0 3.385 2.656 1.427 6.518l3.839 3.247Z"
          />
          <path
            fill="#4285F4"
            d="M23.636 12.273c0-.818-.073-1.609-.209-2.373H12v4.618h6.518a5.57 5.57 0 0 1-2.418 3.655l3.827 3.236C22.182 19.345 23.636 16.082 23.636 12.273Z"
          />
          <path
            fill="#FBBC05"
            d="M5.266 14.235A7.098 7.098 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.427 6.518A11.93 11.93 0 0 0 0 12c0 1.955.473 3.8 1.309 5.436l3.957-3.201Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.245 0 5.973-1.073 7.964-2.909l-3.827-3.236c-1.064.718-2.427 1.145-4.137 1.145-3.182 0-5.873-2.145-6.836-5.027l-3.955 3.2A11.968 11.968 0 0 0 12 24Z"
          />
        </svg>
        Continue with Google
      </button>

      {/* 🚀 Pixel-Accurate Google Account Selection Modal */}
      {showMockPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/40 backdrop-blur-[1px] p-4 animate-fade-in">
          <div className="w-full max-w-[430px] bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.15)] overflow-hidden border border-[#dadce0] flex flex-col select-none">
            
            {/* Google Styled Header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#dadce0] bg-white">
              <div className="flex items-center gap-2.5">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.842 1.096 15.105 0 12 0 7.354 0 3.385 2.656 1.427 6.518l3.839 3.247Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.636 12.273c0-.818-.073-1.609-.209-2.373H12v4.618h6.518a5.57 5.57 0 0 1-2.418 3.655l3.827 3.236C22.182 19.345 23.636 16.082 23.636 12.273Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 14.235A7.098 7.098 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.427 6.518A11.93 11.93 0 0 0 0 12c0 1.955.473 3.8 1.309 5.436l3.957-3.201Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.245 0 5.973-1.073 7.964-2.909l-3.827-3.236c-1.064.718-2.427 1.145-4.137 1.145-3.182 0-5.873-2.145-6.836-5.027l-3.955 3.2A11.968 11.968 0 0 0 12 24Z"
                  />
                </svg>
                <span className="text-[#3c4043] font-medium text-[13.5px] font-sans">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMockPanel(false);
                  setShowCustomInput(false);
                }}
                className="text-[#5f6368] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Core Google Sign-In Body */}
            <div className="px-10 pt-8 pb-7 flex flex-col items-center">
              
              {/* Peach Emoji Badge (Matches "Choose an account" Figma screenshot) */}
              <div className="w-10 h-10 bg-[#fef0ec] rounded-lg flex items-center justify-center text-lg mb-3 border border-[#ffd5cc] shadow-sm select-none">
                ✌️
              </div>

              <h2 className="text-[#202124] font-normal text-[22px] tracking-normal text-center leading-8 font-sans">
                Choose an account
              </h2>
              <p className="text-[#5f6368] text-[13.5px] text-center mt-1 leading-5 font-sans">
                to continue to <span className="text-[#1a73e8] font-medium hover:underline cursor-pointer">EduReach</span>
              </p>

              {/* Conditional Display: List vs Manual Inputs */}
              {!showCustomInput ? (
                <div className="w-full mt-7 divide-y divide-[#dadce0] border-t border-b border-[#dadce0]">
                  {/* Saksham Sharma */}
                  <button
                    type="button"
                    onClick={() => handleMockSelect("Saksham Sharma", "saksham@gmail.com")}
                    className="w-full flex items-center gap-4 py-3 px-1 hover:bg-[#f8f9fa] text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#673ab7] flex items-center justify-center text-white text-[12px] font-bold select-none">
                      S
                    </div>
                    <div className="flex-1">
                      <div className="text-[#3c4043] font-medium text-[13.5px] leading-tight font-sans">Saksham Sharma</div>
                      <div className="text-[#5f6368] text-[11.5px] mt-0.5 font-sans font-normal">saksham@gmail.com</div>
                    </div>
                  </button>

                  {/* Ram Kumar */}
                  <button
                    type="button"
                    onClick={() => handleMockSelect("Ram Kumar", "ram@gmail.com")}
                    className="w-full flex items-center gap-4 py-3 px-1 hover:bg-[#f8f9fa] text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#00bcd4] flex items-center justify-center text-white text-[12px] font-bold select-none">
                      R
                    </div>
                    <div className="flex-1">
                      <div className="text-[#3c4043] font-medium text-[13.5px] leading-tight font-sans">Ram Kumar</div>
                      <div className="text-[#5f6368] text-[11.5px] mt-0.5 font-sans font-normal">ram@gmail.com</div>
                    </div>
                  </button>

                  {/* Use another account */}
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full flex items-center gap-4 py-3 px-1 hover:bg-[#f8f9fa] text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-full border border-[#dadce0] flex items-center justify-center bg-white text-[#5f6368] select-none">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 text-[#1a73e8] font-medium text-[13.5px] font-sans">
                      Use another account
                    </div>
                  </button>
                </div>
              ) : (
                <div className="w-full mt-6 space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[12px] font-semibold text-[#5f6368] font-sans">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#dadce0] rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] text-[14px] outline-none text-[#202124] transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <label className="text-[12px] font-semibold text-[#5f6368] font-sans">Email Address</label>
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-[#dadce0] rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] text-[14px] outline-none text-[#202124] transition-all font-sans"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(false);
                        setCustomName("");
                        setCustomEmail("");
                      }}
                      className="text-[#1a73e8] hover:text-[#1557b0] text-[13px] font-medium font-sans hover:underline"
                    >
                      ← Back to accounts
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!customName.trim() || !customEmail.trim()) {
                          toast.error("Please fill in both Name and Email.");
                          return;
                        }
                        handleMockSelect(customName.trim(), customEmail.trim());
                      }}
                      className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 py-2 rounded text-[13.5px] font-medium shadow-sm transition-colors duration-150 font-sans"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Google Styled Footer Policies */}
            <div className="px-10 py-5 text-[#5f6368] text-[11px] leading-[1.5] font-sans font-normal border-t border-[#f1f3f4] bg-[#f8f9fa]/50 text-left">
              To continue, Google will share your name, email address, language preference, and profile picture with EduReach. Before using this app, you can review EduReach's <span className="text-[#1a73e8] hover:underline cursor-pointer">privacy policy</span> and <span className="text-[#1a73e8] hover:underline cursor-pointer">terms of service</span>.
            </div>
          </div>
        </div>
      )}

      {/* 📞 Pixel-Accurate Google Phone Completion Dialog */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#202124]/40 backdrop-blur-[1px] p-4 animate-fade-in">
          <div className="w-full max-w-[430px] bg-white rounded-lg shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.15)] overflow-hidden border border-[#dadce0] flex flex-col select-none">
            
            {/* Google Header */}
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-[#dadce0] bg-white">
              <div className="flex items-center gap-2.5">
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.842 1.096 15.105 0 12 0 7.354 0 3.385 2.656 1.427 6.518l3.839 3.247Z" />
                  <path fill="#4285F4" d="M23.636 12.273c0-.818-.073-1.609-.209-2.373H12v4.618h6.518a5.57 5.57 0 0 1-2.418 3.655l3.827 3.236C22.182 19.345 23.636 16.082 23.636 12.273Z" />
                  <path fill="#FBBC05" d="M5.266 14.235A7.098 7.098 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.427 6.518A11.93 11.93 0 0 0 0 12c0 1.955.473 3.8 1.309 5.436l3.957-3.201Z" />
                  <path fill="#34A853" d="M12 24c3.245 0 5.973-1.073 7.964-2.909l-3.827-3.236c-1.064.718-2.427 1.145-4.137 1.145-3.182 0-5.873-2.145-6.836-5.027l-3.955 3.2A11.968 11.968 0 0 0 12 24Z" />
                </svg>
                <span className="text-[#3c4043] font-medium text-[13.5px] font-sans">Sign in with Google</span>
              </div>
            </div>

            {/* Content Body */}
            <div className="px-10 pt-8 pb-7 flex flex-col items-center">
              
              <div className="w-10 h-10 bg-[#fef0ec] rounded-lg flex items-center justify-center text-lg mb-3 border border-[#ffd5cc] shadow-sm select-none">
                📞
              </div>

              <h2 className="text-[#202124] font-normal text-[22px] tracking-normal text-center leading-8 font-sans">
                Verify your phone
              </h2>
              <p className="text-[#5f6368] text-[13.5px] text-center mt-1 leading-5 font-sans">
                EduReach requires a phone number to assign you a dynamic admissions counselor.
              </p>

              <form onSubmit={handlePhoneSubmit} className="w-full mt-7 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[12px] font-semibold text-[#5f6368] font-sans">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91-9876543210"
                    className="w-full px-3 py-2.5 border border-[#dadce0] rounded focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] text-[14px] outline-none text-[#202124] transition-all font-sans"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-[#1a73e8] hover:bg-[#1557b0] text-white px-5 py-2.5 rounded text-[13.5px] font-medium shadow-sm transition-colors duration-150 font-sans"
                  >
                    Register & Continue
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-10 py-5 text-[#5f6368] text-[11px] leading-[1.5] font-sans font-normal border-t border-[#f1f3f4] bg-[#f8f9fa]/50 text-left">
              By registering, you agree to receive SMS communications from EduReach regarding academic counseling and campus placements.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

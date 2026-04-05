import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  section_id: string;
  username: string;
  message: string;
  created_at: string;
}

const ANIMAL_NAMES = [
  "Fox", "Eagle", "Wolf", "Bear", "Lion", "Tiger", "Hawk", "Owl",
  "Deer", "Rabbit", "Panther", "Cheetah", "Leopard", "Falcon", "Raven",
  "Dolphin", "Whale", "Shark", "Stingray", "Octopus", "Penguin", "Seal",
  "Otter", "Beaver", "Moose", "Elk", "Bison", "Coyote", "Lynx", "Marten"
];

const SECTION_TITLES: Record<string, string> = {
  "latest-results": "Latest Results",
  "upcoming-exams": "Upcoming Exams",
  "answer-keys": "Answer Keys",
  "government-exams": "Government Exams"
};

// Helper to format dynamic section name
const formatSectionName = (slug: string): string => {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const generateAnonymousName = (): string => {
  const randomAnimal = ANIMAL_NAMES[Math.floor(Math.random() * ANIMAL_NAMES.length)];
  return `Anonymous ${randomAnimal}`;
};

const getOrCreateUsername = (): string => {
  // Always generate a new anonymous name - no localStorage persistence
  return generateAnonymousName();
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

export const ChatPage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const countryCode = searchParams.get("country");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [username, setUsername] = useState<string>("");
  const [tempUsername, setTempUsername] = useState("");
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [sectionColor, setSectionColor] = useState<string>("#7c3aed");

  const validSectionId = sectionId || "latest-results";
  const sectionTitle = SECTION_TITLES[validSectionId] || formatSectionName(validSectionId);

  // Fetch section color from database
  useEffect(() => {
    const fetchSectionColor = async () => {
      const { data, error } = await supabase
        .from("dynamic_sections")
        .select("color")
        .eq("slug", validSectionId)
        .single();
      
      if (data?.color) {
        setSectionColor(data.color);
      }
    };
    
    fetchSectionColor();
  }, [validSectionId]);

  // Always show name prompt on mount - temporary name only
  useEffect(() => {
    setTempUsername(generateAnonymousName());
    setShowNamePrompt(true);
  }, []);

  // Focus name input when prompt shows
  useEffect(() => {
    if (showNamePrompt) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [showNamePrompt]);

  const handleSetUsername = () => {
    const finalName = tempUsername.trim() || generateAnonymousName();
    // Don't store in localStorage - temporary only
    setUsername(finalName);
    setShowNamePrompt(false);
  };

  const handleSkip = () => {
    const autoName = generateAnonymousName();
    // Don't store in localStorage - temporary only
    setUsername(autoName);
    setShowNamePrompt(false);
  };

  // Fetch initial messages
  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("section_id", validSectionId)
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) throw error;
        setMessages(data?.reverse() || []);
      } catch (err) {
        setError("Failed to load messages. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, [validSectionId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const subscription = supabase
      .channel(`chat-${validSectionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `section_id=eq.${validSectionId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            // Prevent duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            // Keep only last 100 messages
            const updated = [...prev, newMsg];
            if (updated.length > 100) return updated.slice(-100);
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [validSectionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount (only if not showing name prompt)
  useEffect(() => {
    if (!showNamePrompt) {
      inputRef.current?.focus();
    }
  }, [showNamePrompt]);

  const handleSend = async () => {
    if (!newMessage.trim() || newMessage.length > 300 || !username) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase.from("chat_messages").insert({
        section_id: validSectionId,
        username,
        message: messageText
      });

      if (error) throw error;
    } catch {
      setError("Failed to send message. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", backgroundColor: "white" }}>
      {showNamePrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}
          >
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  background: sectionColor,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px"
                }}
              >
                <MessageCircle size={28} color="white" />
              </div>
              <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "#111827" }}>
                Join Chat
              </h2>
              <p style={{ margin: "8px 0 0", fontSize: "14px", color: "#6b7280" }}>
                Set a temporary name for this chat session
              </p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                Your Name (optional)
              </label>
              <input
                ref={nameInputRef}
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value.slice(0, 30))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSetUsername();
                }}
                placeholder="Enter your name..."
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box"
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = sectionColor)}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
              />
              <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#9ca3af" }}>
                Leave empty for anonymous name
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleSkip}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#6b7280",
                  cursor: "pointer",
                  transition: "background 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#f3f4f6")}
              >
                Skip
              </button>
              <button
                onClick={handleSetUsername}
                style={{
                  flex: 2,
                  padding: "14px",
                  background: sectionColor,
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "white",
                  cursor: "pointer",
                  transition: "opacity 0.15s"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Join Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        style={{
          background: sectionColor,
          padding: "16px 20px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexShrink: 0,
          zIndex: 100
        }}
      >
        <button
          onClick={() => {
            if (countryCode) {
              navigate(`/?country=${countryCode}`);
            } else {
              navigate("/");
            }
          }}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "8px",
            padding: "10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            transition: "background 0.15s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.3)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(13px, 3vw, 17px)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <MessageCircle size={20} />
            {sectionTitle}
            <span style={{ opacity: 0.8, fontWeight: 400 }}>Peer Chat Room</span>
          </h1>
        </div>

        <div
          style={{
            fontSize: "12px",
            opacity: 0.9,
            background: "rgba(255,255,255,0.15)",
            padding: "6px 12px",
            borderRadius: "20px"
          }}
        >
          {username}
        </div>
      </header>

      {/* Banner */}
      <div
        style={{
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "12px 20px",
          textAlign: "center",
          flexShrink: 0
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "clamp(12px, 3vw, 14px)",
            color: "#64748b"
          }}
        >
          You are chatting with peers waiting for the same updates. No sign-in required.
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px",
          background: "white"
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "40px 20px",
              color: "#64748b"
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                border: `3px solid ${sectionColor}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }}
            />
            <p style={{ margin: 0, fontSize: "14px" }}>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#94a3b8"
            }}
          >
            <MessageCircle size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#64748b" }}>
              No messages yet
            </p>
            <p style={{ margin: "8px 0 0", fontSize: "14px" }}>
              Be the first to start the conversation!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              maxWidth: "800px",
              margin: "0 auto"
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.username === username ? "flex-end" : "flex-start",
                  gap: "4px"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "8px"
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: msg.username === username ? sectionColor : "#475569"
                    }}
                  >
                    {msg.username}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8"
                    }}
                  >
                    {formatTime(msg.created_at)}
                  </span>
                </div>
                <div
                  style={{
                    background: msg.username === username ? sectionColor : "#f1f5f9",
                    color: msg.username === username ? "white" : "#334155",
                    padding: "12px 16px",
                    borderRadius: msg.username === username ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    maxWidth: "85%",
                    wordBreak: "break-word",
                    fontSize: "clamp(14px, 3.5vw, 15px)",
                    lineHeight: "1.5"
                  }}
                >
                  {msg.message}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Toast */}
      {error && (
        <div
          style={{
            position: "fixed",
            top: "80px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#dc2626",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            zIndex: 200,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          {error}
        </div>
      )}

      {/* Input */}
      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          padding: "16px 20px",
          background: "white",
          flexShrink: 0
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "12px",
            maxWidth: "800px",
            margin: "0 auto"
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value.slice(0, 300))}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "14px 18px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              fontSize: "clamp(14px, 3.5vw, 15px)",
              outline: "none",
              transition: "border-color 0.15s"
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = sectionColor)}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || newMessage.length > 300}
            style={{
              background: newMessage.trim() && newMessage.length <= 300 ? sectionColor : "#cbd5e1",
              color: "white",
              border: "none",
              borderRadius: "12px",
              padding: "14px 20px",
              cursor: newMessage.trim() && newMessage.length <= 300 ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s"
            }}
          >
            <Send size={20} />
          </button>
        </div>
        <div
          style={{
            maxWidth: "800px",
            margin: "8px auto 0",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: newMessage.length > 300 ? "#dc2626" : "#94a3b8"
          }}
        >
          <span>Press Enter to send</span>
          <span>{newMessage.length}/300</span>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

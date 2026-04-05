import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatFloatingButtonProps {
  sectionId: string;
  hasUnread?: boolean;
}

export const ChatFloatingButton = ({ sectionId, hasUnread = false }: ChatFloatingButtonProps) => {
  const navigate = useNavigate();
  const [color, setColor] = useState<string>("#dc2626");

  useEffect(() => {
    const fetchSectionColor = async () => {
      const { data, error } = await supabase
        .from("dynamic_sections")
        .select("color")
        .eq("slug", sectionId)
        .single();
      
      if (data?.color) {
        setColor(data.color);
      }
    };
    
    fetchSectionColor();
  }, [sectionId]);

  return (
    <button
      onClick={() => navigate(`/chat/${sectionId}`)}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        background: color,
        color: "white",
        border: "none",
        borderRadius: "50px",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        fontSize: "14px",
        fontWeight: 600,
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        zIndex: 100,
        transition: "transform 0.15s, box-shadow 0.15s"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.05)";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
      }}
    >
      <MessageCircle size={20} />
      <span style={{ whiteSpace: "nowrap" }}>Chat with peers</span>
      {hasUnread && (
        <span
          style={{
            width: "10px",
            height: "10px",
            background: "#fbbf24",
            borderRadius: "50%",
            animation: "pulse 1.5s infinite"
          }}
        />
      )}
    </button>
  );
};

export default ChatFloatingButton;

import { Search } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  count: number;
  countBg: string;
  countColor: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortButton?: React.ReactNode;
}

export const SectionHeader = ({
  title,
  icon,
  iconBg,
  iconColor,
  count,
  countBg,
  countColor,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortButton,
}: SectionHeaderProps) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              padding: 10,
              background: iconBg,
              borderRadius: 8,
              color: iconColor,
            }}
          >
            {icon}
          </div>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
            }}
          >
            {title}
          </h3>
          <span
            style={{
              padding: "4px 12px",
              background: countBg,
              color: countColor,
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {count}
          </span>
        </div>
        {sortButton}
      </div>

      <div
        className="section-search-bar"
        style={{
          marginBottom: 16,
        }}
      >
        <div
          className="section-search-inner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "white",
            border: "1.5px solid #d1d5db",
            borderRadius: 8,
          }}
        >
          <Search size={18} color="#9ca3af" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: "#374151",
            }}
          />
        </div>
      </div>
    </div>
  );
};

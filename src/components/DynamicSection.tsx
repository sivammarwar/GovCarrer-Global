import { useState } from "react";
import { Link } from "react-router-dom";
import { useDynamicSectionItems, type DynamicSection } from "@/hooks/useDynamicSections";
import {
  FileText, TrendingUp, Calendar, FileCheck, Award, Briefcase,
  Bell, BookOpen, Clipboard, GraduationCap, Building, Globe,
  Shield, Star, Users, ArrowUpDown,
} from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import "./DynamicSection.css";

interface DynamicSectionComponentProps {
  section: DynamicSection;
  countryId?: string;
  isActive: boolean;
  onClick: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText size={18} />,
  TrendingUp: <TrendingUp size={18} />,
  Calendar: <Calendar size={18} />,
  FileCheck: <FileCheck size={18} />,
  Award: <Award size={18} />,
  Briefcase: <Briefcase size={18} />,
  Bell: <Bell size={18} />,
  BookOpen: <BookOpen size={18} />,
  Clipboard: <Clipboard size={18} />,
  GraduationCap: <GraduationCap size={18} />,
  Building: <Building size={18} />,
  Globe: <Globe size={18} />,
  Shield: <Shield size={18} />,
  Star: <Star size={18} />,
  Users: <Users size={18} />,
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  red:    { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  green:  { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  blue:   { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  purple: { bg: "#f5f3ff", text: "#6b21a8", border: "#ddd6fe" },
  orange: { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  yellow: { bg: "#fefce8", text: "#854d0e", border: "#fde047" },
  pink:   { bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8" },
  indigo: { bg: "#eef2ff", text: "#3730a3", border: "#c7d2fe" },
};

/*
  CONTENT_MIN_HEIGHT must be tall enough to contain a typical page of results.
  The 0.305 CLS was caused by:
    1. Skeleton renders at ~300px
    2. Content loads → empty state "Nothing to show yet" renders at ~60px
    3. Page shifts UP by ~240px → massive CLS

  The fix: the wrapper always occupies CONTENT_MIN_HEIGHT via minHeight.
  We never let the box shrink below this — not during loading, not when empty,
  not when content is present. Content grows naturally beyond this floor.

  We use opacity transitions (not display:none / conditional rendering) so
  the DOM height never changes during state transitions.
*/
const CONTENT_MIN_HEIGHT = 400;

export const DynamicSectionComponent = ({
  section,
  countryId,
  isActive,
  onClick,
}: DynamicSectionComponentProps) => {
  const { items, loading } = useDynamicSectionItems(
    isActive ? section.id : null,
    countryId
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(false);

  const filteredItems = items.filter(
    (item) =>
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle &&
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedByDate = section.show_in_timeline
    ? groupItemsByDate(filteredItems, sortAscending)
    : [{ date: "all", items: filteredItems }];

  const colors = colorMap[section.color] || colorMap.blue;
  const isEmpty =
    !loading &&
    (groupedByDate.length === 0 || groupedByDate[0]?.items?.length === 0);

  return (
    <div
      className="timeline-section"
      style={{ display: isActive ? "block" : "none" }}
    >
      <SectionHeader
        title={section.name}
        icon={iconMap[section.icon] || <FileText size={18} />}
        iconBg={colors.bg}
        iconColor={colors.text}
        count={items.length}
        countBg={colors.bg}
        countColor={colors.text}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={`Search ${section.name.toLowerCase()}...`}
        sortButton={
          section.show_in_timeline ? (
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="timeline-sort-toggle"
            >
              <ArrowUpDown size={14} />
              {sortAscending ? "Oldest First" : "Newest First"}
            </button>
          ) : null
        }
      />

      {/*
        STABLE WRAPPER — always minHeight: CONTENT_MIN_HEIGHT.
        This is the element PageSpeed reported as the CLS culprit.
        By giving it a permanent floor height and only toggling opacity
        (not height or display) between states, the layout is geometrically
        stable throughout the loading → loaded → empty cycle.
      */}
      <div style={{ position: "relative", minHeight: CONTENT_MIN_HEIGHT }}>

        {/* ── Skeleton — visible while loading ──────────────────── */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            padding: "24px 0",
            opacity: loading ? 1 : 0,
            // pointer-events:none so hidden skeleton doesn't block clicks
            pointerEvents: loading ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                <div style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "#e2e8f0", opacity: 0.5, flexShrink: 0,
                }} />
                <div style={{
                  flex: 1, height: "64px", background: "#e2e8f0",
                  borderRadius: "8px", opacity: 0.3 + i * 0.05,
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Empty state — visible when loaded but no items ─────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: isEmpty ? 1 : 0,
            pointerEvents: isEmpty ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <p className="timeline-empty" style={{ margin: 0 }}>
            Nothing to show yet.
          </p>
        </div>

        {/* ── Real content — visible when loaded and has items ───── */}
        <div
          style={{
            opacity: !loading && !isEmpty ? 1 : 0,
            pointerEvents: !loading && !isEmpty ? "auto" : "none",
            transition: "opacity 0.2s ease",
          }}
        >
          <div className="timeline-container">
            {groupedByDate.map((group) => (
              <div key={group.date} className="timeline-group">
                {section.show_in_timeline && (
                  <div
                    className={`timeline-date-circle ${
                      group.date === "TBA" ? "tba" : ""
                    }`}
                  >
                    <span className="date-month">
                      {formatDateDisplay(group.date).month}
                    </span>
                    <span className="date-day">
                      {formatDateDisplay(group.date).day}
                    </span>
                  </div>
                )}
                <div className="timeline-items">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      to={
                        item.slug
                          ? `/section/${section.slug}/${item.slug}`
                          : "#"
                      }
                      className="timeline-item"
                    >
                      <span className="timeline-item-title">{item.title}</span>
                      {item.subtitle && (
                        <span className="timeline-item-subtitle">
                          {item.subtitle}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const groupItemsByDate = (items: any[], ascending = false) => {
  const groups: Record<string, any[]> = {};
  items.forEach((item) => {
    const key = item.date_value || "TBA";
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return Object.entries(groups)
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => {
      if (a.date === "TBA") return 1;
      if (b.date === "TBA") return -1;
      const tA = new Date(a.date).getTime();
      const tB = new Date(b.date).getTime();
      return ascending ? tA - tB : tB - tA;
    });
};

const formatDateDisplay = (dateStr: string) => {
  if (dateStr === "TBA") return { day: "TBA", month: "" };
  const d = new Date(dateStr);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: d.getDate().toString(),
  };
};

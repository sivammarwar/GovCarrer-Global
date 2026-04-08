import { useState } from "react";
import { Link } from "react-router-dom";
import { useDynamicSectionItems, type DynamicSection } from "@/hooks/useDynamicSections";
import { FileText, TrendingUp, Calendar, FileCheck, Award, Briefcase, Bell, BookOpen, Clipboard, GraduationCap, Building, Globe, Shield, Star, Users, ArrowUpDown } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { ChatFloatingButton } from "./ChatFloatingButton";
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
  red: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  green: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  blue: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  purple: { bg: "#f5f3ff", text: "#6b21a8", border: "#ddd6fe" },
  orange: { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  yellow: { bg: "#fefce8", text: "#854d0e", border: "#fde047" },
  pink: { bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8" },
  indigo: { bg: "#eef2ff", text: "#3730a3", border: "#c7d2fe" },
};

// Minimum height for the content area — matches skeleton so there's no
// layout jump when we transition from loading → content → empty states.
const CONTENT_MIN_HEIGHT = '300px';

export const DynamicSectionComponent = ({ section, countryId, isActive, onClick }: DynamicSectionComponentProps) => {
  const { items, loading } = useDynamicSectionItems(isActive ? section.id : null, countryId);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortAscending, setSortAscending] = useState(false);

  const filteredItems = items.filter(item =>
    searchQuery === "" ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupedByDate = section.show_in_timeline
    ? groupItemsByDate(filteredItems, sortAscending)
    : [{ date: "all", items: filteredItems }];

  const colors = colorMap[section.color] || colorMap.blue;

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
          section.show_in_timeline && (
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="timeline-sort-toggle"
            >
              <ArrowUpDown size={14} />
              {sortAscending ? "Oldest First" : "Newest First"}
            </button>
          )
        }
      />

      {loading ? (
        /*
          Skeleton — minHeight matches the content area so neither the
          skeleton→empty transition nor skeleton→content transition shifts
          the page. This was responsible for the 0.013 CLS entry.
        */
        <div style={{ padding: '24px 0', minHeight: CONTENT_MIN_HEIGHT }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                width: '100%', maxWidth: '280px', height: '72px',
                background: '#e2e8f0', borderRadius: '8px',
                opacity: 0.4 + (i * 0.1)
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#e2e8f0', opacity: 0.4, flexShrink: 0
                }} />
                <div style={{
                  flex: 1, height: '64px', background: '#e2e8f0',
                  borderRadius: '8px', opacity: 0.3 + (i * 0.05)
                }} />
              </div>
            ))}
          </div>
        </div>
      ) : groupedByDate.length === 0 || (groupedByDate[0]?.items?.length === 0) ? (
        /*
          FIX: Empty state now has the same minHeight as the skeleton.
          Previously the empty state was much shorter than the skeleton,
          so when data loaded and turned out to be empty, the page jumped
          up — that was the 0.013 CLS entry in the layout shift report.
        */
        <div
          className="timeline-empty"
          style={{ minHeight: CONTENT_MIN_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          Nothing to show yet.
        </div>
      ) : (
        <div className="timeline-container">
          {groupedByDate.map((group) => (
            <div key={group.date} className="timeline-group">
              {section.show_in_timeline && (
                <div className={`timeline-date-circle ${group.date === "TBA" ? "tba" : ""}`}>
                  <span className="date-month">{formatDateDisplay(group.date).month}</span>
                  <span className="date-day">{formatDateDisplay(group.date).day}</span>
                </div>
              )}
              <div className="timeline-items">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    to={item.slug ? `/section/${section.slug}/${item.slug}` : "#"}
                    className="timeline-item"
                  >
                    <span className="timeline-item-title">{item.title}</span>
                    {item.subtitle && (
                      <span className="timeline-item-subtitle">{item.subtitle}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const groupItemsByDate = (items: any[], ascending: boolean = false) => {
  const groups: Record<string, any[]> = {};
  items.forEach((item) => {
    const dateKey = item.date_value || "TBA";
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  });
  return Object.entries(groups)
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => {
      if (a.date === "TBA") return 1;
      if (b.date === "TBA") return -1;
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return ascending ? timeA - timeB : timeB - timeA;
    });
};

const formatDateDisplay = (dateStr: string) => {
  if (dateStr === "TBA") return { day: "TBA", month: "" };
  const date = new Date(dateStr);
  return {
    month: date.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day: date.getDate().toString(),
  };
};

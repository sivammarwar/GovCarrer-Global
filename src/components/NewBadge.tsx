import { Sparkles } from "lucide-react";

interface NewBadgeProps {
  date: string | Date;
  className?: string;
}

export const NewBadge = ({ date, className = "" }: NewBadgeProps) => {
  // Check if the item was posted within the last 2 weeks (14 days)
  const isNew = () => {
    const itemDate = new Date(date);
    const currentDate = new Date();
    const twoWeeksAgo = new Date(currentDate.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    return itemDate >= twoWeeksAgo;
  };

  if (!isNew()) return null;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-sm shadow-sm ${className}`}>
      <Sparkles className="w-3 h-3" />
      NEW
    </div>
  );
};
import { useAuth } from '../../context/AuthContext';
import { User } from 'lucide-react';

export default function StudentMenu() {
  const { user } = useAuth();

  // Extract name from email (e.g., "john.doe@gmail.com" -> "John Doe")
  const getNameFromEmail = (email) => {
    if (!email) return 'Guest';
    const part = email.split('@')[0];
    return part
      .split(/[\.\-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const displayName = user?.displayName || getNameFromEmail(user?.email);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 max-w-[46vw] sm:max-w-none">
      <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
        <User className="w-3.5 h-3.5" />
      </span>
      <span className="text-sm font-medium text-slate-800 truncate">
        {displayName}
      </span>
    </div>
  );
}

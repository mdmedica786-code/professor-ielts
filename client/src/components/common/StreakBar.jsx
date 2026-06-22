import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Flame, Star, Trophy } from 'lucide-react';

export default function StreakBar() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get('/user/stats')
      .then(res => {
        if (res.data?.success) setStats(res.data.data);
      })
      .catch(() => {});
  }, [user]);

  if (!stats || !user) return null;

  const latestBadge = stats.badgeDetails?.[stats.badgeDetails.length - 1];

  return (
    <div className="flex items-center gap-3 text-xs">
      {/* Streak */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-600 font-bold" title={`${stats.streak} day streak`}>
        <Flame className="w-3.5 h-3.5" />
        <span>{stats.streak}</span>
      </div>

      {/* XP */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-50 text-violet-600 font-bold" title={`${stats.xp} XP`}>
        <Star className="w-3.5 h-3.5" />
        <span>{stats.xp} XP</span>
      </div>

      {/* Latest Badge */}
      {latestBadge && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold" title={latestBadge.desc}>
          <span>{latestBadge.icon}</span>
          <span className="hidden sm:inline">{latestBadge.name}</span>
        </div>
      )}
    </div>
  );
}

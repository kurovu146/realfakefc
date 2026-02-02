import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  message: string;
  link: string;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      checkUnread(data);
    }
  };

  const checkUnread = (data: Notification[]) => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    const count = data.filter(n => !readIds.includes(n.id)).length;
    setUnreadCount(count);
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('public_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, 
        (payload) => {
            const newNoti = payload.new as Notification;
            setNotifications(prev => [newNoti, ...prev]);
            setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRead = (id: number) => {
    const readIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
    if (!readIds.includes(id)) {
        const newReadIds = [...readIds, id];
        localStorage.setItem('read_notifications', JSON.stringify(newReadIds));
        setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);
  };

  const markAllRead = () => {
      const allIds = notifications.map(n => n.id);
      const currentReadIds = JSON.parse(localStorage.getItem('read_notifications') || '[]');
      const newReadIds = Array.from(new Set([...currentReadIds, ...allIds]));
      localStorage.setItem('read_notifications', JSON.stringify(newReadIds));
      setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5 md:w-6 md:h-6 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-pl-purple animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-pl-purple text-white">
            <h3 className="font-heading font-bold text-sm uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] font-bold underline hover:text-pl-green cursor-pointer">Mark all read</button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(n => {
                  const isRead = JSON.parse(localStorage.getItem('read_notifications') || '[]').includes(n.id);
                  return (
                    <Link 
                        key={n.id} 
                        to={n.link || '#'} 
                        onClick={() => handleRead(n.id)}
                        className={`block p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!isRead ? 'bg-pl-purple/5' : ''}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-xs font-bold ${!isRead ? 'text-pl-purple' : 'text-gray-600'}`}>{n.title}</h4>
                            {!isRead && <span className="w-1.5 h-1.5 bg-pl-pink rounded-full"></span>}
                        </div>
                        <p className="text-[10px] text-gray-500 line-clamp-2">{n.message}</p>
                        <span className="text-[9px] text-gray-300 mt-2 block font-mono">{new Date(n.created_at).toLocaleDateString()}</span>
                    </Link>
                  );
              })
            ) : (
              <div className="p-8 text-center text-gray-300 text-xs italic">No new notifications</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

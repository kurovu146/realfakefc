import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Fixtures', path: '/fixtures' },
    { label: 'Players', path: '/players' },
    { label: 'Stats', path: '/stats' },
    { label: 'Admin', path: '/admin' },
  ];

  return (
    <header className="bg-pl-purple text-white sticky top-0 z-50 shadow-md border-b-4 border-pl-green">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-pl-pink rounded-full flex items-center justify-center font-bold text-pl-purple text-xl group-hover:scale-110 transition-transform">
            RF
          </div>
          <span className="font-heading text-2xl font-bold uppercase tracking-wide group-hover:text-pl-green transition-colors">RealFake FC</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 font-heading text-lg font-bold uppercase items-center">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "hover:text-pl-green transition-colors py-2 border-b-2 border-transparent cursor-pointer",
                location.pathname === item.path && "text-pl-green border-pl-green"
              )}
            >
              {item.label}
            </Link>
          ))}
          
          {/* Auth Button */}
          {user ? (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/20">
               <div className="flex flex-col items-end">
                  <span className="text-[10px] text-pl-green font-bold uppercase leading-none">
                    {useAuth().isAdmin ? 'Admin' : 'Member'}
                  </span>
                  <span className="text-xs opacity-70 truncate max-w-[100px]">{user.email}</span>
               </div>
               <button 
                 onClick={() => logout()}
                 className="bg-white/10 hover:bg-red-500 p-1.5 rounded transition-colors cursor-pointer"
                 title="Logout"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                 </svg>
               </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="ml-4 bg-pl-green text-pl-purple hover:bg-white text-xs font-bold py-1.5 px-4 rounded transition-colors cursor-pointer"
            >
              LOGIN
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-white hover:text-pl-green transition-colors cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden bg-pl-purple border-t border-pl-pink py-4 animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-4 px-4 font-heading text-lg font-bold uppercase">
            {navItems.map(item => (
              <Link 
                key={item.path} 
                to={item.path} 
                className={cn(
                  "hover:text-pl-green block py-2 border-l-4 border-transparent pl-2 cursor-pointer",
                   location.pathname === item.path && "text-pl-green border-pl-green bg-white/5"
                )}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {user ? (
                <button onClick={() => { logout(); setIsOpen(false); }} className="text-left py-2 text-red-400 font-bold border-l-4 border-transparent pl-2 uppercase cursor-pointer">Logout</button>
            ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="py-2 text-pl-green font-bold border-l-4 border-transparent pl-2 uppercase cursor-pointer">Login</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

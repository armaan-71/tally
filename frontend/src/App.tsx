import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  MessageSquare, 
  Wallet, 
  ArrowUpRight, 
  Send, 
  Bot, 
  User, 
  ChevronRight,
  TrendingUp,
  Clock
} from 'lucide-react';

// --- Types ---
interface Commission {
  id: string;
  amount: string;
  deal: {
    externalId: string;
    amount: string;
    currency: string;
    closedAt: string;
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string[];
}

// --- Components ---

const Header = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) => {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#37352F] rounded-md flex items-center justify-center text-white font-bold text-xl">
          T
        </div>
        <span className="font-semibold text-lg tracking-tight">Tally</span>
      </div>
      
      <nav className="flex items-center gap-1 bg-[#F1F1F0] p-1 rounded-lg">
        <button 
          onClick={() => setActiveTab('payouts')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'payouts' ? 'bg-white shadow-sm text-[#37352F]' : 'text-[#9B9A97] hover:text-[#37352F]'
          }`}
        >
          Payouts
        </button>
        <button 
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            activeTab === 'agent' ? 'bg-white shadow-sm text-[#37352F]' : 'text-[#9B9A97] hover:text-[#37352F]'
          }`}
        >
          Tally Agent
        </button>
      </nav>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#F1F1F0] flex items-center justify-center text-xs font-semibold">
          AN
        </div>
      </div>
    </header>
  );
};

const PayoutsTab = () => {
  const [stats, setStats] = useState({ totalEarned: '0' });
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, commsRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/commissions')
        ]);
        setStats(await statsRes.json());
        setCommissions(await commsRes.json());
      } catch (err) {
        console.error('Failed to fetch payouts data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#37352F]"></div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl mx-auto py-10 px-6 space-y-10"
    >
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[#9B9A97] uppercase tracking-wider flex items-center gap-2">
          <TrendingUp size={14} /> Total Earnings
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-bold tracking-tighter text-[#37352F]">
            ${parseFloat(stats.totalEarned).toLocaleString()}
          </span>
          <span className="text-[#9B9A97] font-medium text-lg">USD</span>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[#37352F]">Recent Commissions</h3>
          <button className="text-sm font-medium text-[#2383E2] hover:underline flex items-center gap-1">
            View all <ChevronRight size={14} />
          </button>
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#F9F9F9] border-b border-[#E5E5E5]">
                <th className="px-6 py-4 text-xs font-semibold text-[#9B9A97] uppercase">Deal ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#9B9A97] uppercase">Closed Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#9B9A97] uppercase">Deal Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#9B9A97] uppercase text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-[#9B9A97]">No commissions found. Sync deals to get started.</td>
                </tr>
              ) : (
                commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F9F9F9] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#37352F]">
                      {c.deal.externalId}
                    </td>
                    <td className="px-6 py-4 text-[#9B9A97] text-sm">
                      {new Date(c.deal.closedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-[#37352F] font-medium">
                      ${parseFloat(c.deal.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-[#2383E2] font-semibold">
                      +${parseFloat(c.amount).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
};

const ChatTab = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I’m the Tally Agent. Ask me anything about your commissions or sales policies.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response, 
        thoughts: data.thoughts 
      }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col pt-6"
    >
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 space-y-8 scroll-smooth"
      >
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant' ? 'bg-[#37352F] text-white' : 'bg-[#E5E5E5] text-[#37352F]'
            }`}>
              {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
            </div>
            <div className={`max-w-[85%] space-y-2 ${msg.role === 'user' ? 'flex flex-col items-end' : ''}`}>
              {msg.thoughts && msg.thoughts.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-1 px-1">
                  {msg.thoughts.map((thought, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ 
                        duration: 0.4,
                        delay: idx * 0.2
                      }}
                      className="flex items-center gap-2 text-[#9B9A97] text-[13px] font-medium"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E5E5E5] shrink-0" />
                      {thought}
                    </motion.div>
                  ))}
                </div>
              )}
              <motion.div 
                initial={msg.role === 'assistant' ? { opacity: 0, y: 5 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: msg.role === 'assistant' ? (msg.thoughts?.length || 0) * 0.2 + 0.2 : 0 }}
                className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  msg.role === 'assistant' 
                    ? 'bg-[#F1F1F0] text-[#37352F]' 
                    : 'bg-[#2383E2] text-white'
                }`}
              >
                {msg.content}
              </motion.div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#37352F] text-white flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-[#F1F1F0] rounded-2xl px-4 py-2.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#9B9A97] rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-[#9B9A97] rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-[#9B9A97] rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="relative group">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Tally Agent..."
            className="w-full bg-[#F1F1F0] border border-transparent focus:border-[#E5E5E5] focus:bg-white rounded-xl px-4 py-3 pr-12 outline-none transition-all text-[#37352F]"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1.5 p-1.5 bg-[#37352F] text-white rounded-lg hover:opacity-90 disabled:opacity-30 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-[#9B9A97]">
          Tally Agent can make mistakes. Check important financial info.
        </p>
      </div>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('payouts');

  return (
    <div className="min-h-screen bg-white">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main>
        <AnimatePresence mode="wait">
          {activeTab === 'payouts' ? (
            <PayoutsTab key="payouts" />
          ) : (
            <ChatTab key="agent" />
          )}
        </AnimatePresence>
      </main>

      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[url('https://notion.so/images/page-cover/met_henry_farny_into_the_unknown.jpg')] opacity-[0.03] bg-cover"></div>
    </div>
  );
}

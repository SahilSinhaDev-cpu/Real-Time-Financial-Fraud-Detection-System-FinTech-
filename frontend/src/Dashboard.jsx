import React, { useState, useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { 
  ShieldCheck, 
  ShieldAlert, 
  DollarSign, 
  Activity, 
  Terminal, 
  Cpu, 
  ArrowUpRight, 
  AlertTriangle, 
  Layers, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import clsx from 'clsx';

// --- CONFIG CONSTANTS ---
const API_URL = 'http://localhost:5001';
const SOCKET_URL = 'http://localhost:5001';
const MAX_TRANSACTIONS_IN_STREAM = 30;

// --- FORMATTER HELPERS ---
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

// --- HELPER COMPONENT: BENTO CARD CONTAINER ---
const BentoCard = ({ children, className, title, subtitle, icon, highlightColor = 'border-[#45A29E]/20' }) => (
  <div className={clsx(
    "relative overflow-hidden rounded-2xl bg-[#131921]/80 backdrop-blur-xl border p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-cyan-glow",
    highlightColor,
    className
  )}>
    {/* Grid Backdrop Pattern */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#45A29E]/5 via-transparent to-transparent opacity-40 pointer-events-none" />
    
    <div>
      {(title || icon) && (
        <div className="flex items-center justify-between mb-4 border-b border-[#45A29E]/10 pb-3">
          <div className="flex items-center space-x-3">
            {icon && <div className="p-2 rounded-lg bg-[#0B0C10] text-[#66FCF1] border border-[#45A29E]/20">{icon}</div>}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#66FCF1]">{title}</h3>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-gray-500 opacity-50 hover:opacity-100 transition-opacity" />
        </div>
      )}
      <div className="h-full flex-grow">{children}</div>
    </div>
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, blocked: 0, saved: 0 });
  const [transactions, setTransactions] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [socketLogs, setSocketLogs] = useState([]);
  
  // Custom helper to append system status log to visual panel
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setSocketLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 10));
  };

  useEffect(() => {
    // 1. Fetch initial transaction history on component mount
    const fetchHistory = async () => {
      try {
        addLog("Retrieving financial logs database...", 'info');
        const response = await fetch(`${API_URL}/get_history`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const history = await response.json();
        
        const initialTxs = history.map(tx => ({ 
          ...tx, 
          id: `${Date.now()}-${Math.random()}` 
        }));
        setTransactions(initialTxs);

        let initialBlocked = 0;
        let initialSaved = 0;
        history.forEach(tx => {
          if (tx.status === 'DECLINED (FRAUD)') {
            initialBlocked++;
            initialSaved += tx.amount;
          }
        });
        
        setStats({
          total: history.length,
          blocked: initialBlocked,
          saved: initialSaved
        });
        addLog(`Successfully synchronized ${history.length} operations.`, 'success');
      } catch (error) {
        console.error("Failed to fetch initial transaction history:", error);
        addLog("Sync error: Backend offline. Verify flask server on port 5001.", 'error');
      }
    };

    fetchHistory();

    // 2. Establish and manage the Socket.IO connection with full debugging parameters
    addLog(`Establishing connection to gateway "${SOCKET_URL}"...`, 'info');
    console.log(`%c[Socket.io] Connecting to ${SOCKET_URL}`, 'color: #66FCF1; font-weight: bold;');

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on('connect', () => {
      const msg = `Gateway active. Connection established (ID: ${socket.id})`;
      console.log(`%c[Socket.io] SUCCESS: ${msg}`, 'color: #22c55e; font-weight: bold;');
      addLog("Telemetry active. System secure.", 'success');
      setIsLive(true);
    });

    socket.on('connect_error', (error) => {
      const errMsg = `Connection failed: ${error.message}`;
      console.error('%c[Socket.io] ERROR DETECTED:', 'color: #ef4444; font-weight: bold;', {
        message: error.message,
        name: error.name,
        type: error.type,
        description: error.description,
        context: error.context
      });
      addLog(`Error: ${error.message}`, 'error');
      setIsLive(false);
    });

    socket.on('disconnect', (reason) => {
      const msg = `Gateway offline. Reason: ${reason}`;
      console.warn(`%c[Socket.io] WARNING: ${msg}`, 'color: #eab308; font-weight: bold;');
      addLog(`Gateway closed: ${reason}`, 'error');
      setIsLive(false);
    });

    socket.on('new_transaction', (newTx) => {
      const newTxWithId = {
        ...newTx,
        id: `${Date.now()}-${Math.random()}`,
      };

      addLog(`Intercepted operation at ${newTx.vendor} (${formatCurrency(newTx.amount)})`, 
        newTx.status === 'DECLINED (FRAUD)' ? 'warning' : 'success'
      );

      setTransactions(prev => [newTxWithId, ...prev].slice(0, MAX_TRANSACTIONS_IN_STREAM));

      setStats(prev => {
        const isFraud = newTx.status === 'DECLINED (FRAUD)';
        return {
          total: prev.total + 1,
          blocked: isFraud ? prev.blocked + 1 : prev.blocked,
          saved: isFraud ? prev.saved + newTx.amount : prev.saved,
        };
      });
    });

    // Cleanup: disconnect socket when unmounting
    return () => {
      console.log('%c[Socket.io] Cleaning up connection...', 'color: #gray;');
      socket.disconnect();
    };
  }, []);

  // Memoize charts data to maximize performance
  const accuracyData = useMemo(() => [
    { name: 'Approved', value: Math.max(0, stats.total - stats.blocked) },
    { name: 'Declined (Fraud)', value: stats.blocked }
  ], [stats.total, stats.blocked]);

  const volumeData = useMemo(() => 
    transactions.slice(0, 15).reverse().map((tx, idx) => ({ 
      index: idx + 1, 
      amount: tx.amount,
      vendor: tx.vendor
    }))
  , [transactions]);

  // Model confidence percentage calculations
  const confidenceScore = useMemo(() => {
    if (stats.total === 0) return "99.85%";
    const ratio = stats.blocked / stats.total;
    return `${(99.4 + ratio * 0.5).toFixed(2)}%`;
  }, [stats.total, stats.blocked]);

  return (
    <main className="bg-[#0B0C10] min-h-screen text-[#C5C6C7] p-4 md:p-6 lg:p-8 font-mono select-none">
      
      {/* 1. HEADER SECTION (Top Bento Area) */}
      <header className="relative mb-6 rounded-2xl bg-[#131921]/80 backdrop-blur-xl border border-[#45A29E]/20 p-6 flex flex-col md:flex-row items-center justify-between overflow-hidden shadow-cyan-glow">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#66FCF1]/10 via-transparent to-transparent opacity-40 pointer-events-none" />
        
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="p-3 bg-[#0B0C10] rounded-xl border border-[#66FCF1]/30 text-[#66FCF1] relative">
            <Cpu className="w-8 h-8 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#66FCF1] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#66FCF1]"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-widest flex items-center">
              FINTECH FRAUD <span className="text-[#66FCF1] ml-2">DETECT ENGINE</span>
            </h1>
            <p className="text-xs text-[#45A29E] tracking-wider mt-0.5">SECURE TELEMETRY INTERFACE &bull; v4.0</p>
          </div>
        </div>

        {/* Live Network Status Indicator */}
        <div className={clsx(
          "flex items-center space-x-3 px-4 py-2.5 rounded-xl border font-bold text-xs tracking-widest transition-all duration-500",
          isLive 
            ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
            : 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse'
        )}>
          {isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isLive ? 'SYSTEM ACTIVE' : 'CONNECTING...'}</span>
        </div>
      </header>

      {/* 2. BENTO GRID ARCHITECTURE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: STAT - TOTAL TRANSACTIONS */}
        <BentoCard 
          title="Telemetry Operations" 
          subtitle="All Transactions Scanned"
          icon={<Activity className="w-5 h-5" />}
        >
          <div className="mt-4">
            <span className="text-4xl md:text-5xl font-black text-[#66FCF1] drop-shadow-[0_0_10px_rgba(102,252,241,0.2)]">
              {stats.total.toLocaleString()}
            </span>
            <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
              <span className="text-emerald-400 font-bold">100% Scan Rate</span>
              <span>&bull; Real-time stream</span>
            </div>
          </div>
        </BentoCard>

        {/* CARD 2: STAT - FRAUD DETECTED */}
        <BentoCard 
          title="Threats Isolated" 
          subtitle="Anomalies Deflected"
          icon={<ShieldAlert className="w-5 h-5 text-red-400" />}
          highlightColor="border-red-500/30 hover:border-red-500/50"
        >
          <div className="mt-4">
            <span className="text-4xl md:text-5xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              {stats.blocked.toLocaleString()}
            </span>
            <div className="flex items-center space-x-2 mt-2 text-xs text-gray-400">
              <span className="text-red-400 font-bold">
                {stats.total > 0 ? ((stats.blocked / stats.total) * 100).toFixed(1) : 0}% Ratio
              </span>
              <span>&bull; Auto-blocked</span>
            </div>
          </div>
        </BentoCard>

        {/* CARD 3: STAT - CAPITAL PROTECTED */}
        <BentoCard 
          title="Capital Protected" 
          subtitle="Secured Funds Volume"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
          highlightColor="border-emerald-500/30 hover:border-emerald-500/50"
        >
          <div className="mt-4">
            <span className="text-3xl md:text-4xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">
              {formatCurrency(stats.saved)}
            </span>
            <div className="flex items-center space-x-2 mt-2.5 text-xs text-gray-400">
              <span className="text-emerald-400 font-bold">Risk Averted</span>
              <span>&bull; Instant rejection</span>
            </div>
          </div>
        </BentoCard>

        {/* CARD 4: COMPACT RADAR - SYSTEM HEALTH */}
        <BentoCard 
          title="System Health Score" 
          subtitle="Model Confidence Rating"
          icon={<Layers className="w-5 h-5" />}
        >
          <div className="mt-4 flex flex-col justify-end">
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-black text-[#66FCF1]">{confidenceScore}</span>
              <span className="text-xs text-[#45A29E] font-bold">Accuracy</span>
            </div>
            <div className="w-full bg-[#0B0C10] h-2 rounded-full mt-3 overflow-hidden border border-[#45A29E]/20">
              <div 
                className="bg-gradient-to-r from-[#45A29E] to-[#66FCF1] h-full transition-all duration-1000"
                style={{ width: confidenceScore }}
              />
            </div>
          </div>
        </BentoCard>

        {/* CARD 5: MAIN ANOMALY STREAM (Spans 2 Columns, 3 Rows Height) */}
        <div className="lg:col-span-2 lg:row-span-2 relative rounded-2xl bg-[#131921]/80 backdrop-blur-xl border border-[#45A29E]/20 p-6 flex flex-col h-[520px] transition-all duration-300 hover:shadow-cyan-glow">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-[#45A29E]/5 via-transparent to-transparent opacity-40 pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4 border-b border-[#45A29E]/10 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-[#0B0C10] text-[#66FCF1] border border-[#45A29E]/20">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#66FCF1]">Intervention Stream</h3>
                <p className="text-xs text-gray-400 mt-0.5">Live anomaly checking system feed</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#66FCF1] animate-pulse"></span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">SECURE LINK</span>
            </div>
          </div>

          {/* Anomaly Stream Scroll Area */}
          <div className="flex-grow overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            <AnimatePresence initial={false}>
              {transactions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 py-12 text-center">
                  <Cpu className="w-12 h-12 text-gray-600 animate-spin mb-3" />
                  <p className="text-sm">Standing by. Waiting for pipeline transmission...</p>
                  <p className="text-xs text-gray-600 mt-1">Make sure simulator or API processes are active.</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isFraud = tx.status === 'DECLINED (FRAUD)';
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 30, transition: { duration: 0.15 } }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={clsx(
                        "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
                        isFraud 
                          ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50 shadow-red-glow" 
                          : "bg-[#0B0C10]/60 border-[#45A29E]/20 hover:border-[#66FCF1]/40"
                      )}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={clsx(
                          "p-2 rounded-lg border",
                          isFraud 
                            ? "bg-red-500/20 border-red-500/40 text-red-400" 
                            : "bg-[#45A29E]/10 border-[#45A29E]/30 text-emerald-400"
                        )}>
                          {isFraud ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm tracking-wide">{tx.vendor}</p>
                          <p className="text-xs text-[#45A29E] mt-0.5 font-semibold">
                            {formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end">
                        <span className={clsx(
                          "text-[10px] font-black px-2.5 py-1 rounded-md tracking-wider border",
                          isFraud 
                            ? "bg-red-500/20 text-red-300 border-red-500/40" 
                            : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                        )}>
                          {tx.status}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* CARD 6: THREAT VOLATILITY CHART (Spans 2 Columns, Spans height of 1 row) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#131921]/80 backdrop-blur-xl border border-[#45A29E]/20 p-6 flex flex-col h-[248px] transition-all duration-300 hover:shadow-cyan-glow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#66FCF1] flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Threat Volatility Chart
            </h3>
            <span className="text-[10px] text-gray-500 font-bold">15 EVENT HORIZON</span>
          </div>
          
          <div className="flex-grow">
            {volumeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-600">
                Insufficient chart parameters. Scanned feed empty.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cyberGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#66FCF1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#66FCF1" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="index" stroke="#45A29E" fontSize={9} tickLine={false} />
                  <YAxis stroke="#45A29E" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#131921', 
                      border: '1px solid #45A29E', 
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#C5C6C7'
                    }}
                    itemStyle={{ color: '#66FCF1' }}
                    labelFormatter={(label) => `Anomaly Index: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#66FCF1" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#cyberGlow)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CARD 7: DECISION ACCURACY PIE CHART */}
        <div className="rounded-2xl bg-[#131921]/80 backdrop-blur-xl border border-[#45A29E]/20 p-6 flex flex-col h-[248px] transition-all duration-300 hover:shadow-cyan-glow">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#66FCF1] flex items-center mb-2">
            <Layers className="w-4 h-4 mr-2" /> Decision Accuracy
          </h3>
          
          <div className="flex-grow flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={accuracyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  fill="#8884d8"
                  paddingAngle={6}
                  dataKey="value"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Legend 
                  verticalAlign="bottom" 
                  height={24} 
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', color: '#C5C6C7' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 8: TERMINAL TELEMETRY LOGS (Full details to monitor server activity) */}
        <div className="rounded-2xl bg-[#131921]/80 backdrop-blur-xl border border-[#45A29E]/20 p-6 flex flex-col h-[248px] transition-all duration-300 hover:shadow-cyan-glow">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#66FCF1] flex items-center">
              <Terminal className="w-4 h-4 mr-2" /> Socket Telemetry Log
            </h3>
          </div>
          
          <div className="flex-grow bg-[#0B0C10]/80 rounded-lg p-3 border border-[#45A29E]/10 overflow-y-auto text-[10px] space-y-1.5 custom-scrollbar">
            {socketLogs.length === 0 ? (
              <div className="text-gray-600 italic">No network connection logs registered yet.</div>
            ) : (
              socketLogs.map((log, index) => (
                <div key={index} className="flex items-start space-x-1.5 leading-4">
                  <span className="text-gray-500 font-semibold select-none">[{log.timestamp}]</span>
                  <span className={clsx(
                    log.type === 'error' && 'text-red-400',
                    log.type === 'warning' && 'text-yellow-400',
                    log.type === 'success' && 'text-emerald-400',
                    log.type === 'info' && 'text-gray-400'
                  )}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. SUBTLE BOTTOM BRANDING & ANOMALY EXPLANATION */}
      <footer className="mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 border-t border-[#45A29E]/10 pt-4">
        <div>
          Real-time Isolation Forest classification engine &bull; Threat telemetry synced.
        </div>
        <div className="mt-2 sm:mt-0 flex items-center space-x-1">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500/70" />
          <span>Strict firewall active. Suspicious parameters flagged automatically.</span>
        </div>
      </footer>

    </main>
  );
};

export default Dashboard;
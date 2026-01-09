import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { 
  Scale, Target, Plus, Trash2, Activity, Dumbbell, Ruler, Edit2, Copy, Check, X, 
  AlertCircle, Loader2, RefreshCw, Upload, Cloud, Camera, Image as ImageIcon, 
  Calendar as CalendarIcon, LineChart as ChartIcon, ClipboardList, PlusCircle, 
  History, ChevronLeft, ChevronRight, BookOpen, Eye, EyeOff, Search, ChevronDown, 
  Database, Timer, CheckCircle, Volume2, VolumeX, Music, Save, XCircle, LogOut, User, MapPin, Wrench, AlertTriangle, ArrowRightLeft, Video, ExternalLink, Play, Utensils, Flame, FileText, Sparkles, MessageSquare, Bot, Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- [1. 全域配置] ---
 
// 🔥🔥🔥 [修改處] 這裡改成讀取環境變數，請勿再將 Key 直接貼在這裡 🔥🔥🔥
// 請確認 Netlify 後台的變數名稱設定為: VITE_GOOGLE_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ""; 

const GLOBAL_STYLE = `
  @keyframes dot-flash-red {
    0% { r: 4; fill: #ef4444; filter: drop-shadow(0 0 2px #ef4444); }
    50% { r: 6; fill: #f87171; filter: drop-shadow(0 0 5px #ef4444); }
    100% { r: 4; fill: #ef4444; filter: drop-shadow(0 0 2px #ef4444); }
  }
  .animate-trend-warning { animation: dot-flash-red 1s infinite ease-in-out; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
   
  /* 隱藏數字輸入框箭頭 */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

const firebaseConfig = { 
  apiKey: "AIzaSyAKgPusc2ckogI6S2tkytNKZqpu-TiR8ig", 
  authDomain: "roygym2-ce85c.firebaseapp.com", 
  projectId: "roygym2-ce85c", 
  storageBucket: "roygym2-ce85c.firebasestorage.app", 
  messagingSenderId: "476108578502", 
  appId: "1:476108578502:web:9d26dd1c1323b3e24081c7" 
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 常數定義
const TOOLS = ['啞鈴', '槓鈴', '機械', '繩索', '自體重', '壺鈴', '史密斯'];
const MUSCLES = ['胸', '背', '肩', '腿', '手', '腹'];
const TRAIN_MODES = ['次數', '秒數', '趟數'];

const DEFAULT_DATA = { 
  goals: { targetWeight: 66, targetBodyFat: 14, targetCalories: 2000, targetDate: '2026-12-31' },
  profile: { birthday: '1995-01-01', gender: 'male', height: 175, activity: 'moderate', diet: 'none' },
  entries: [], exercises: [], logs: [], dailyPlans: {}, aiAdvice: [],
  planTemplates: ['胸日', '背日', '腿日', '肩日'] 
};

// --- [2. 工具函數] ---
const lbsToKg = (lbs: number) => parseFloat((lbs / 2.20462).toFixed(2));
const calculate1RM = (w: number, r: number) => (!r || r <= 1) ? w : w * (1 + r / 30);
const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const compressImage = (file: File): Promise<string> => new Promise((res) => {
  const reader = new FileReader(); reader.readAsDataURL(file);
  reader.onload = (ev) => {
    const img = new Image(); img.src = ev.target?.result as string;
    img.onload = () => {
      const cvs = document.createElement('canvas'); const MAX = 800;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      cvs.width = w; cvs.height = h;
      cvs.getContext('2d')?.drawImage(img, 0, 0, w, h);
      res(cvs.toDataURL('image/jpeg', 0.6));
    };
  };
});

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// --- [3. 彈窗組件] ---

const UserProfileModal = ({ isOpen, onClose, data, onUpdate }: any) => {
  const [localProfile, setLocalProfile] = useState(data.profile || DEFAULT_DATA.profile);
  useEffect(() => { if (isOpen) setLocalProfile(data.profile || DEFAULT_DATA.profile); }, [isOpen, data.profile]);

  const handleSave = () => {
    onUpdate({ ...data, profile: localProfile });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><User className="text-indigo-600"/> 個人身分紀錄</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-bold text-slate-400 mb-1 block">生日</label><input type="date" value={localProfile.birthday} onChange={e=>setLocalProfile({...localProfile, birthday: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500" /></div>
            <div><label className="text-xs font-bold text-slate-400 mb-1 block">性別</label><select value={localProfile.gender} onChange={e=>setLocalProfile({...localProfile, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500"><option value="male">男性</option><option value="female">女性</option></select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-400 mb-1 block">身高 (cm)</label><div className="relative"><input type="number" inputMode="numeric" value={localProfile.height} onChange={e=>setLocalProfile({...localProfile, height: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 pl-10" /><Ruler size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div>
          <div><label className="text-xs font-bold text-slate-400 mb-1 block">日常活動量</label><div className="relative"><select value={localProfile.activity} onChange={e=>setLocalProfile({...localProfile, activity: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 pl-10 appearance-none"><option value="sedentary">久坐 (BMR x 1.2)</option><option value="light">輕度 (BMR x 1.375)</option><option value="moderate">中度 (BMR x 1.55)</option><option value="heavy">重度 (BMR x 1.725)</option><option value="athlete">極重度 (BMR x 1.9)</option></select><Activity size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div>
          <div><label className="text-xs font-bold text-slate-400 mb-1 block">飲食偏好</label><div className="relative"><select value={localProfile.diet} onChange={e=>setLocalProfile({...localProfile, diet: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 pl-10 appearance-none"><option value="none">無特別限制</option><option value="vegan">純素 (Vegan)</option><option value="ovo-lacto">蛋奶素</option><option value="no-beef">不吃牛</option><option value="keto">生酮飲食</option></select><Utensils size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/></div></div>
        </div>
        <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-transform mt-2">儲存設定</button>
      </div>
    </div>
  );
};

const VideoPlayerModal = ({ isOpen, onClose, videoUrl, title }: any) => {
  if (!isOpen || !videoUrl) return null;
  const youtubeId = getYoutubeId(videoUrl);

  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-black w-full max-w-3xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 flex justify-between items-center text-white bg-slate-900/50">
          <h3 className="font-bold flex items-center gap-2"><Video size={18} className="text-red-500"/> {title}</h3>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button>
        </div>
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {youtubeId ? (
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          ) : (
            <div className="text-center p-8 text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50"/>
              <p className="mb-4">此連結不支援內嵌播放</p>
              <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">
                <ExternalLink size={16}/> 前往網頁觀看
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white p-6 rounded-[2rem] w-full max-w-xs text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
        <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={24} /></div>
        <h3 className="font-black text-lg text-slate-800 mb-2">確認操作</h3><p className="text-slate-500 text-sm font-bold mb-6">{message}</p>
        <div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black active:scale-95 transition-transform">取消</button><button onClick={onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 active:scale-95 transition-transform">確認</button></div>
      </div>
    </div>
  );
};

const DataTransferModal = ({ isOpen, type, data, onImport, onClose }: any) => {
  const [json, setJson] = useState('');
  useEffect(() => { if (isOpen && type === 'export') setJson(JSON.stringify(data, null, 2)); }, [isOpen, type, data]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 flex flex-col max-h-[80vh]">
        <div className="flex justify-between mb-4 font-black"><h3>數據管理 ({type==='export'?'匯出':'匯入'})</h3><button onClick={onClose}><X/></button></div>
        <textarea className="flex-1 border rounded-xl p-3 font-mono text-[11px] mb-4 bg-slate-50 outline-none" value={json} onChange={e=>setJson(e.target.value)} readOnly={type==='export'} />
        <button onClick={()=>{ if(type==='export') { navigator.clipboard.writeText(json); alert('已複製'); } else { try{onImport(JSON.parse(json));onClose();alert('匯入成功');}catch(e){alert('格式錯誤');}} }} className="bg-indigo-600 text-white py-4 rounded-xl font-black">確認</button>
      </div>
    </div>
  );
};

const RestTimerModal = ({ isOpen, onClose, defaultSeconds = 90 }: any) => {
  const [seconds, setSeconds] = useState(defaultSeconds);
  const [audioState, setAudioState] = useState<'locked' | 'ready'>('locked');
  const silenceAudio = useRef<HTMLAudioElement | null>(null);
  const beepAudio = useRef<HTMLAudioElement | null>(null);
  const unlockAudio = () => {
    if (!silenceAudio.current) { silenceAudio.current = new Audio("https://github.com/anars/blank-audio/raw/master/10-seconds-of-silence.mp3"); silenceAudio.current.loop = true; }
    if (!beepAudio.current) { beepAudio.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"); }
    silenceAudio.current.play().then(() => setAudioState('ready')).catch(() => {});
  };
  useEffect(() => {
    if (!isOpen) { if (silenceAudio.current) silenceAudio.current.pause(); return; }
    const endTime = Date.now() + defaultSeconds * 1000;
    const t = setInterval(() => {
      const rem = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setSeconds(rem);
      if (rem <= 5 && rem > 0) beepAudio.current?.play().catch(()=>{});
      if (rem === 0) { beepAudio.current?.play().catch(()=>{}); clearInterval(t); setTimeout(onClose, 1500); }
    }, 1000);
    return () => clearInterval(t);
  }, [isOpen, defaultSeconds]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100000] flex items-end justify-center p-4 pointer-events-none">
      <div className="bg-slate-900 text-white p-6 w-full max-w-xs rounded-[2.5rem] shadow-2xl pointer-events-auto border border-slate-700">
        <div className="flex justify-between mb-4 items-center font-black text-xs uppercase opacity-50"><span>休息計時</span><button onClick={onClose}><X/></button></div>
        <div className={`text-center text-7xl font-black font-mono mb-6 ${seconds <= 10 ? "text-red-500" : ""}`}>{Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,'0')}</div>
        {audioState === 'locked' ? (<button onClick={unlockAudio} className="w-full bg-amber-500 text-slate-900 py-4 rounded-2xl font-black mb-4 animate-bounce">啟動背景音</button>) : (<div className="text-center text-emerald-400 font-bold text-[10px] mb-4 uppercase">背景模式運行中</div>)}
        <div className="flex gap-2"><button onClick={unlockAudio} className="flex-1 bg-slate-800 py-3 rounded-2xl text-xs font-bold">+30s</button><button onClick={onClose} className="flex-1 bg-indigo-600 py-3 rounded-2xl text-xs font-bold shadow-lg">下一組</button></div>
      </div>
    </div>
  );
};

const DatePickerModal = ({ isOpen, onClose, currentDate, onSelect }: any) => {
  const [viewDate, setViewDate] = useState(new Date(currentDate)); 
  useEffect(() => { if(isOpen) setViewDate(new Date(currentDate)); }, [isOpen, currentDate]);
  if (!isOpen) return null;
  const year = viewDate.getFullYear(); const month = viewDate.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay(); 
  const handleDayClick = (day: number) => { const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; onSelect(dateStr); onClose(); };
  return (
    <div className="fixed inset-0 bg-black/70 z-[120000] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-xs p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><ChevronLeft/></button><span className="font-black text-xl text-slate-700">{year}年 {month + 1}月</span><button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><ChevronRight/></button>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center mb-2">{['日','一','二','三','四','五','六'].map(d=><span key={d} className="text-xs font-bold text-slate-300">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}{Array.from({ length: daysInMonth }).map((_, i) => { const day = i + 1; const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear(); const isSelected = day === new Date(currentDate).getDate() && month === new Date(currentDate).getMonth() && year === new Date(currentDate).getFullYear(); return (<button key={day} onClick={() => handleDayClick(day)} className={`aspect-square rounded-2xl flex items-center justify-center font-black text-sm transition-all active:scale-90 ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : isToday ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'text-slate-600 hover:bg-slate-50'}`}>{day}</button>); })}</div>
        <button onClick={onClose} className="mt-6 w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm">取消</button>
      </div>
    </div>
  );
};

const HistoryManagementModal = ({ isOpen, onClose, data, onUpdate, targetId }: any) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  if (!isOpen || !targetId) return null;
  const targetEx = data.exercises.find((e:any) => e.id === targetId);
  const logs = data.logs.filter((l:any) => l.exerciseId === targetId).sort((a:any, b:any) => b.date.localeCompare(a.date));
  return (
    <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-4 font-black"><h3>{targetEx?.name} 歷史數據</h3><button onClick={onClose}><X/></button></div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">{logs.map((log:any) => (<div key={log.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border"><div className="flex flex-col"><span className="text-[10px] font-black text-slate-400">{log.date}</span><span className="font-black text-slate-700">{log.originalWeight}{log.originalUnit} x {log.reps}</span></div><button onClick={() => { if(deleteId === log.id) { onUpdate({...data, logs: data.logs.filter((l:any)=>l.id!==log.id)}); setDeleteId(null); } else { setDeleteId(log.id); setTimeout(()=>setDeleteId(null), 3000); }}} className={`p-2 rounded-xl transition-all ${deleteId===log.id?'bg-red-500 text-white':'text-slate-300'}`}><Trash2 size={16}/></button></div>))}</div>
      </div>
    </div>
  );
};

const CopyWorkoutModal = ({ isOpen, onClose, data, onCopy }: any) => {
  const [viewDate, setViewDate] = useState(new Date());
  if (!isOpen) return null;
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const calendarDays = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => i + 1);
  const firstDay = new Date(year, month, 1).getDay();
  return (
    <div className="fixed inset-0 bg-black/70 z-[110000] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 shadow-2xl flex flex-col" onClick={e=>e.stopPropagation()}>
        <div className="flex justify-between mb-6 font-black text-xl text-indigo-600"><div className="flex items-center gap-2"><History/> 複製歷史</div><button onClick={onClose}><X/></button></div>
        <div className="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-2xl border"><button onClick={()=>setViewDate(new Date(year, month-1, 1))}><ChevronLeft/></button><span className="font-black">{year}年 {month + 1}月</span><button onClick={()=>setViewDate(new Date(year, month+1, 1))}><ChevronRight/></button></div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({length:firstDay}).map((_,i)=><div key={`empty-${i}`}/>)}
          {calendarDays.map(day => { 
            const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`; 
            const planName = data.dailyPlans?.[dStr]; 
            return (
              <button key={day} disabled={!planName} onClick={()=>{onCopy(dStr); onClose();}} className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 p-1 transition-all active:scale-90 ${planName ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' : 'bg-white text-slate-300 border-slate-50 opacity-40'}`}>
                <span className="text-[12px] font-black mb-1">{day}</span>
                {planName && <span className="text-[8px] font-bold bg-white/20 px-1 rounded truncate w-full text-center leading-tight">{planName}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PlanManageModal = ({ isOpen, onClose, data, onUpdate }: any) => {
  const [newPlan, setNewPlan] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[70vh]">
        <div className="flex justify-between items-center mb-6 font-black text-xl text-indigo-600"><h3>管理計畫模板</h3><button onClick={onClose}><X/></button></div>
        <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-1 no-scrollbar">
          {(data.planTemplates || []).map((plan: string, i: number) => (
            <div key={i} className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {editingIndex === i ? (<input value={editValue} onChange={e => setEditValue(e.target.value)} className="flex-1 bg-white border-2 border-indigo-400 rounded-xl px-3 py-1 font-bold outline-none" autoFocus />) : (<span className="flex-1 font-bold text-slate-700">{plan}</span>)}
              <div className="flex gap-1">
                {editingIndex === i ? (<button onClick={() => { const updated = [...data.planTemplates]; updated[i] = editValue; onUpdate({ ...data, planTemplates: updated }); setEditingIndex(null); }} className="p-2 text-emerald-500 rounded-lg"><Check size={18}/></button>) : (<button onClick={() => { setEditingIndex(i); setEditValue(plan); }} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 size={18}/></button>)}
                <button onClick={() => { setConfirmConfig({ message: '確定刪除此計畫模板？', onConfirm: () => { onUpdate({ ...data, planTemplates: data.planTemplates.filter((_:any, idx:number)=>idx!==i) }); setConfirmConfig(null); }}); }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t flex gap-2"><input placeholder="新增計畫..." value={newPlan} onChange={e => setNewPlan(e.target.value)} className="flex-1 bg-slate-100 rounded-xl px-4 py-3 font-bold outline-none" /><button onClick={() => { if(newPlan.trim()){ onUpdate({...data, planTemplates:[...(data.planTemplates||[]), newPlan.trim()]}); setNewPlan(''); } }} className="bg-indigo-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"><Plus/></button></div>
      </div>
    </div>
  );
};

// [動作庫管理彈窗]
const ExerciseLibraryModal = ({ isOpen, onClose, data, onUpdate }: any) => {
  const [filterMuscle, setFilterMuscle] = useState<string>('胸');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmConfig, setConfirmConfig] = useState<any>(null);
  const [videoModal, setVideoModal] = useState<{open:boolean, url:string, title:string}>({open:false, url:'', title:''}); // [NEW]

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[110000] flex items-center justify-center p-4 backdrop-blur-md">
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <VideoPlayerModal isOpen={videoModal.open} onClose={()=>setVideoModal({...videoModal, open:false})} videoUrl={videoModal.url} title={videoModal.title} />
       
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center mb-6 font-black text-xl text-indigo-600">
          <h3 className="flex items-center gap-2"><BookOpen/> 動作庫維護</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X/></button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
          {MUSCLES.map(m => (
            <button key={m} onClick={() => setFilterMuscle(m)} className={`px-5 py-2 rounded-2xl text-xs font-black transition-all ${filterMuscle === m ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
          {data.exercises.filter((e: any) => e.muscle === filterMuscle).map((ex: any) => (
            <div key={ex.id} className="p-3 rounded-2xl border bg-white flex flex-col gap-2 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                {editingId === ex.id ? (
                  <div className="flex-1 flex gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 border-b-2 border-indigo-500 font-black outline-none px-1" autoFocus />
                    <button onClick={() => { onUpdate({...data, exercises: data.exercises.map((x:any)=>x.id===ex.id?{...x, name:editName}:x)}); setEditingId(null); }} className="p-2 text-emerald-500"><Check/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-hidden">
                    {ex.photo && <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0"><img src={ex.photo} className="w-full h-full object-cover"/></div>}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-black text-slate-700 truncate">{ex.name}</span>
                        {ex.videoUrl && <button onClick={()=>setVideoModal({open:true, url:ex.videoUrl, title:ex.name})} className="text-blue-500 hover:text-blue-600"><Video size={16}/></button>}
                      </div>
                      <div className="flex gap-1 text-[10px] text-slate-400 font-bold">
                        {ex.tool && <span className="bg-slate-100 px-1 rounded">{ex.tool}</span>}
                        {ex.gym && <span className="bg-slate-100 px-1 rounded truncate max-w-[80px]">{ex.gym}</span>}
                        {ex.mode && <span className="bg-indigo-50 text-indigo-500 px-1 rounded">{ex.mode}</span>}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditingId(ex.id); setEditName(ex.name); }} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 size={16}/></button>
                  <button onClick={() => onUpdate({ ...data, exercises: data.exercises.map((x:any)=>x.id===ex.id?{...x, isTracked:x.isTracked===false}:x)})} className="p-2">
                    {ex.isTracked !== false ? <Eye size={16} className="text-teal-500"/> : <EyeOff size={16} className="text-slate-400"/>}
                  </button>
                  <button onClick={() => { setConfirmConfig({ message: '確定要從動作庫徹底刪除嗎？', onConfirm: () => { onUpdate({...data, exercises: data.exercises.filter((x:any)=>x.id!==ex.id)}); setConfirmConfig(null); }}); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- [4. 視圖組件 (Views)] ---

const BodyAnalysisView = ({ data, onUpdate }: any) => {
  const [startDate, setStartDate] = useState('2025-12-02');
  const [endDate, setEndDate] = useState(getLocalDate());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<any>(null);

  const photoEntries = useMemo(() => data.entries.filter((e:any)=>e.date>=startDate && e.date<=endDate && (e.photo || e.inbodyPhoto)).sort((a:any,b:any)=>a.date.localeCompare(b.date)), [data.entries, startDate, endDate]);
  const weightChange = useMemo(() => {
    const all = data.entries.filter((e:any)=>e.date>=startDate && e.date<=endDate).sort((a:any,b:any)=>a.date.localeCompare(b.date));
    return all.length < 2 ? 0 : (all[all.length-1].weight - all[0].weight).toFixed(1);
  }, [data.entries, startDate, endDate]);

  const handleAskAI = async () => {
    if (!GEMINI_API_KEY) { 
      alert("API Key 未設定！\n請前往 Netlify 後台 > Site configuration > Environment variables\n新增變數: VITE_GOOGLE_API_KEY\n並重新部署網站。"); 
      return; 
    }
    setIsAiLoading(true);

    const recentLogs = data.entries.slice(-7).map((e:any) => `${e.date}: ${e.weight}kg`).join('\n');
    const profile = data.profile ? `性別:${data.profile.gender}, 年齡:${new Date().getFullYear()-new Date(data.profile.birthday).getFullYear()}, 身高:${data.profile.height}cm` : '無個人檔案';
    const goal = data.goals ? `目標體重:${data.goals.targetWeight}kg` : '無目標';

    const prompt = `你是一位專業體態管理師。請根據以下數據進行分析並給出建議：
    [使用者資料] ${profile}
    [目標] ${goal}
    [近期體重變化]
    ${recentLogs}
     
    請用繁體中文回答，包含：
    1. 【目前評語】：分析進度與狀況。
    2. 【後續建議】：給出飲食或訓練的具體調整方向。
    3. 總字數請控制在 200 字以內，語氣專業且鼓勵。`;

    const callGemini = async (model: string) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) throw new Error(response.status.toString());
        return await response.json();
    };

    try {
      let result;
      try {
        // [修正] 先嘗試最新模型，若 404 則降級到 gemini-pro
        result = await callGemini('gemini-2.0-flash');
      } catch (e: any) {
        if (e.message === '404') {
          console.warn('Gemini 1.5 Flash not found, switching to Gemini Pro...');
          result = await callGemini('gemini-pro');
        } else {
          throw e;
        }
      }

      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "AI 暫時無法回應，請稍後再試。";
      
      const newAdvice = {
        id: Date.now().toString(),
        date: getLocalDate(),
        text: aiText
      };
      
      onUpdate({ ...data, aiAdvice: [newAdvice, ...(data.aiAdvice || [])] });

    } catch (error: any) {
      console.error(error);
      if (error.message === '404') {
        alert("API Error 404: 您的 API Key 無效或未啟用 AI 服務。\n請務必到 Google AI Studio 申請一個 '新專案' 的 Key。");
      } else {
        alert(`AI 分析失敗 (${error.message})，請檢查 API Key 或網路連線。`);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const latestAdvice = data.aiAdvice && data.aiAdvice.length > 0 ? data.aiAdvice[0] : null;

  return (
    <div className="space-y-6 pb-24">
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <div className="bg-white p-4 rounded-[1.5rem] shadow-sm border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border"><CalendarIcon size={18} className="text-slate-400"/><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent font-bold text-sm outline-none"/><span className="text-slate-300">至</span><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent font-bold text-sm outline-none"/></div>
        <div className="bg-slate-50 px-5 py-3 rounded-2xl border flex items-center gap-4"><span className="text-xs font-black text-slate-400 uppercase tracking-widest">變化</span><span className={`text-xl font-black ${Number(weightChange)<=0?'text-[#1a9478]':'text-red-500'}`}>{Number(weightChange)>0?'+':''}{weightChange} kg</span></div>
      </div>

      {/* AI Coach Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Bot size={120} /></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div><h3 className="font-black text-2xl flex items-center gap-2"><Sparkles className="text-yellow-300 animate-pulse"/> AI 體態管理師</h3><p className="text-indigo-200 text-xs font-bold mt-1">基於您的數據提供專業分析</p></div>
            <button onClick={handleAskAI} disabled={isAiLoading} className="bg-white text-indigo-600 px-5 py-2 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2">{isAiLoading ? <Loader2 className="animate-spin"/> : <MessageSquare size={16}/>} {isAiLoading ? '分析中...' : '諮詢建議'}</button>
          </div>
          {latestAdvice ? (
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
              <div className="flex items-center gap-2 mb-2 opacity-70"><Clock size={12}/><span className="text-[10px]">{latestAdvice.date} 最新建議</span></div>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-line">{latestAdvice.text}</p>
            </div>
          ) : (
            <div className="text-center py-4 text-indigo-200 text-xs font-bold">尚無分析紀錄，點擊按鈕開始諮詢。</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photoEntries.map((e:any)=>(
          <div key={e.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-md group bg-slate-200">
            {/* [修正] 圖片顯示優先順序：有照片顯示照片，無照片但有 InBody 顯示 InBody */}
            <img src={e.photo || e.inbodyPhoto} className="w-full h-full object-cover" />
             
            {/* 提示：如果顯示的是 InBody，或是該日有 InBody 數據，顯示小圖示 */}
            {e.inbodyPhoto && <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-lg shadow-sm"><FileText size={12}/></div>}
             
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-4">
              <div className="text-[10px] text-white/70">{e.date}</div>
              <div className="flex items-end justify-between text-white">
                <div className="flex items-baseline gap-1"><span className="text-2xl font-black">{e.weight}</span><span className="text-[10px]">kg</span></div>
                {e.bodyFat&&<div className="bg-white/20 px-2 py-1 rounded-lg text-[10px]">{e.bodyFat}%</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BodyMetricsView = ({ data, onUpdate }: any) => {
  const [date, setDate] = useState(getLocalDate());
  const [weight, setWeight] = useState(''); const [bodyFat, setBodyFat] = useState(''); const [photo, setPhoto] = useState<string | undefined>();
  const [inbody, setInbody] = useState<string | undefined>(); 
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempW, setTempW] = useState(''); const [tempF, setTempF] = useState(''); 
  const [tempP, setTempP] = useState<string | undefined>();
  const [tempInbody, setTempInbody] = useState<string | undefined>(); 
  const [confirmConfig, setConfirmConfig] = useState<any>(null); 
  const [showDateModal, setShowDateModal] = useState(false); 
  const [isEditingGoal, setIsEditingGoal] = useState(false); 
  const [tempTargetW, setTempTargetW] = useState(data.goals?.targetWeight || ''); 
  const [tempTargetF, setTempTargetF] = useState(data.goals?.targetBodyFat || ''); 
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const chartData = useMemo(() => {
    const sorted = [...data.entries].sort((a:any,b:any)=>a.date.localeCompare(b.date));
    const processed = sorted.map((e:any, i, arr) => { const avg = arr.slice(Math.max(0, i-6), i+1).reduce((s:any, x:any) => s + x.weight, 0) / Math.min(i+1, 7); return { ...e, avgWeight: parseFloat(avg.toFixed(2)) }; });
    return processed.map((e, i, arr) => { const isAvgIncreasing = i > 0 && e.avgWeight > arr[i-1].avgWeight; const isActualRisingTwice = i >= 2 && e.weight > arr[i-1].weight && arr[i-1].weight > arr[i-2].weight; return { ...e, isAvgIncreasing, isActualRisingTwice }; });
  }, [data.entries]);

  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return ['auto', 'auto'];
    const weights = chartData.map((d: any) => d.weight);
    const target = data.goals?.targetWeight || 60;
    const minW = Math.min(...weights, target) - 2; 
    const maxW = Math.max(...weights, target) + 2;
    return [minW, maxW];
  }, [chartData, data.goals?.targetWeight]);

  const tdee = useMemo(() => {
    if (!data.profile || !data.profile.birthday || !data.profile.height) return null;
    const latestHistoryWeight = chartData.length > 0 ? chartData[chartData.length - 1].weight : 0;
    const currentWeight = parseFloat(weight) || latestHistoryWeight;
    if (!currentWeight || currentWeight <= 0) return null;

    const age = new Date().getFullYear() - new Date(data.profile.birthday).getFullYear();
    const h = parseFloat(data.profile.height);
    let bmr = 0;
    if (data.profile.gender === 'male') bmr = 10 * currentWeight + 6.25 * h - 5 * age + 5;
    else bmr = 10 * currentWeight + 6.25 * h - 5 * age - 161;

    const multipliers: any = { sedentary: 1.2, light: 1.375, moderate: 1.55, heavy: 1.725, athlete: 1.9 };
    return Math.round(bmr * (multipliers[data.profile.activity] || 1.2));
  }, [data.profile, weight, chartData]);

  const CustomDotActual = (props: any) => { const { cx, cy, payload } = props; return <circle cx={cx} cy={cy} r={3} fill={payload.isActualRisingTwice ? "#ef4444" : "#94a3b8"} className={payload.isActualRisingTwice ? "animate-trend-warning" : ""} stroke="#fff" strokeWidth={1} />; };
  const CustomDotAvg = (props: any) => { const { cx, cy, payload } = props; return <circle cx={cx} cy={cy} r={4} fill={payload.isAvgIncreasing ? "#ef4444" : "#1a9478"} className={payload.isAvgIncreasing ? "animate-trend-warning" : ""} stroke="#fff" strokeWidth={2} />; };
   
  const handleSave = () => { 
    if(!weight)return; 
    onUpdate({
      ...data, 
      entries:[
        ...data.entries.filter((e:any)=>e.date!==date), 
        {
          id:Date.now().toString(),
          date,
          weight:parseFloat(weight),
          bodyFat:bodyFat?parseFloat(bodyFat):undefined,
          photo,
          inbodyPhoto: inbody 
        }
      ]
    }); 
    setWeight('');setBodyFat('');setPhoto(undefined);setInbody(undefined); 
  };

  const handleSaveGoal = () => {
    onUpdate({ ...data, goals: { ...data.goals, targetWeight: parseFloat(tempTargetW), targetBodyFat: parseFloat(tempTargetF), targetCalories: parseFloat(data.goals?.targetCalories) } });
    setIsEditingGoal(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <style>{GLOBAL_STYLE}</style>
      <UserProfileModal isOpen={isProfileOpen} onClose={()=>setIsProfileOpen(false)} data={data} onUpdate={onUpdate} />
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <DatePickerModal isOpen={showDateModal} onClose={()=>setShowDateModal(false)} currentDate={date} onSelect={setDate} />
       
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* 目標設定區塊 */}
        <div className="bg-white p-6 rounded-[1.5rem] shadow-sm md:col-span-2 border relative">
          <button onClick={()=>setIsProfileOpen(true)} className="absolute top-6 right-20 text-indigo-600 bg-indigo-50 p-2 rounded-full"><User size={16}/></button>
          <div className="flex justify-between mb-4 font-bold text-slate-700">
            <h3>目標設定</h3>
            <div className="flex gap-2">
              <button onClick={()=>{ if(isEditingGoal) handleSaveGoal(); else setIsEditingGoal(true); }} className={`text-xs px-3 py-1 rounded transition-colors ${isEditingGoal ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {isEditingGoal ? '儲存' : '修改'}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-bold text-slate-500">目標體重</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1 w-24">
                  <input type="number" inputMode="decimal" value={tempTargetW} onChange={e=>setTempTargetW(e.target.value)} className="w-full text-right font-black border-b border-indigo-500 outline-none" autoFocus />
                  <span className="text-xs font-bold">kg</span>
                </div>
              ) : (
                <span className="font-black text-lg">{data.goals?.targetWeight || '--'} kg</span>
              )}
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-bold text-slate-500">目標體脂</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1 w-24">
                  <input type="number" inputMode="decimal" value={tempTargetF} onChange={e=>setTempTargetF(e.target.value)} className="w-full text-right font-black border-b border-indigo-500 outline-none" />
                  <span className="text-xs font-bold">%</span>
                </div>
              ) : (
                <span className="font-black text-lg">{data.goals?.targetBodyFat || '--'} %</span>
              )}
            </div>
             <div className="flex justify-between items-center border-b pb-2">
              <span className="text-sm font-bold text-slate-500">TDEE (估算)</span>
              <span className="font-black text-lg text-slate-400">{tdee ? `${tdee} kcal` : <span className="text-xs text-red-400 cursor-pointer" onClick={()=>setIsProfileOpen(true)}>請設定檔案</span>}</span>
            </div>
             <div className="flex justify-between items-center pt-2">
              <span className="text-sm font-bold text-slate-500">每日熱量目標</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1 w-24">
                  <input type="number" inputMode="numeric" value={data.goals?.targetCalories || ''} onChange={e=>onUpdate({...data, goals:{...data.goals, targetCalories: e.target.value}})} className="w-full text-right font-black border-b border-indigo-500 outline-none" />
                </div>
              ) : (
                <span className="font-black text-lg text-indigo-600">{data.goals?.targetCalories || '--'} kcal</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#1a9478] p-8 rounded-[1.5rem] shadow-lg md:col-span-3 text-white flex flex-col justify-between relative overflow-hidden"><div className="absolute top-4 left-4 opacity-20"><Scale size={24}/></div><div><h3 className="text-sm font-bold opacity-80 mb-4 uppercase tracking-tighter">最新數據</h3><div className="flex items-baseline gap-2"><span className="text-6xl font-black">{chartData[chartData.length-1]?.weight || '--'}</span><span className="text-xl font-bold">kg</span></div></div><div className="self-end text-right"><div className="text-xs opacity-70 font-bold mb-1">7日平均</div><div className="text-3xl font-black">{chartData[chartData.length-1]?.avgWeight || '--'} kg</div></div></div>
      </div>
       
      <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border">
        <h2 className="font-black mb-6 flex items-center gap-2"><PlusCircle className="text-teal-600"/> 記錄今日體重</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <button onClick={()=>setShowDateModal(true)} className="flex-1 border p-3 rounded-xl font-bold outline-none bg-slate-50 text-left text-slate-700 flex items-center justify-between">{date} <CalendarIcon size={16} className="opacity-50"/></button>
          <input type="number" inputMode="decimal" placeholder="體重 (kg)" value={weight} onChange={e=>setWeight(e.target.value)} className="flex-1 border p-3 rounded-xl font-bold outline-none bg-slate-50" />
          <input type="number" inputMode="decimal" placeholder="體脂 (%)" value={bodyFat} onChange={e=>setBodyFat(e.target.value)} className="flex-1 border p-3 rounded-xl font-bold outline-none bg-slate-50" />
          <div className="flex gap-2">
            {/* 體態照按鈕 */}
            <button onClick={async()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(ev:any)=>setPhoto(await compressImage(ev.target.files[0]));i.click();}} className={`flex-1 p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-1 ${photo?'bg-teal-50 text-teal-600 border-teal-200':'text-slate-400'}`}>
              {photo ? <Check size={18}/> : <Camera size={18}/>}
            </button>
            {/* [NEW] InBody 按鈕 */}
            <button onClick={async()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(ev:any)=>setInbody(await compressImage(ev.target.files[0]));i.click();}} className={`flex-1 p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-1 ${inbody?'bg-blue-50 text-blue-600 border-blue-200':'text-slate-400'}`}>
              {inbody ? <Check size={18}/> : <FileText size={18}/>}
            </button>
            <button onClick={handleSave} className="flex-[2] bg-[#1a9478] text-white px-8 py-3 rounded-xl font-black shadow-lg">儲存</button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[1.5rem] border h-[400px] shadow-sm relative">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{top:50,right:10,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
            <XAxis dataKey="date" tickFormatter={s=>s.slice(5)} fontSize={10}/>
            {/* [修正] 使用動態計算的 domain，確保目標線不被裁切 */}
            <YAxis domain={yAxisDomain} fontSize={10}/>
            <Tooltip/>
            {/* [NEW] 顯眼的目標線 (強制顯示 Y 軸範圍) */}
            {data.goals?.targetWeight && <ReferenceLine y={data.goals.targetWeight} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label={{value:'目標', position:'insideTopRight', fill:'#ef4444', fontSize:12, fontWeight:'bold'}}/>}
            <Line type="monotone" name="實際" dataKey="weight" stroke="#94a3b8" strokeWidth={1} dot={<CustomDotActual />} />
            <Line type="monotone" name="7日平均" dataKey="avgWeight" stroke="#1a9478" strokeWidth={3} dot={<CustomDotAvg />} />
          </LineChart>
        </ResponsiveContainer>
      </div>
       
      <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-100 overflow-hidden"><div className="p-5 border-b bg-slate-50/50 flex justify-between font-black text-slate-700"><h3>歷史紀錄 (點選修改)</h3></div><div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50 no-scrollbar">{[...data.entries].sort((a,b)=>b.date.localeCompare(a.date)).map((e:any)=>(
        <div key={e.id} className={`p-4 transition-all ${editingId === e.id ? 'bg-indigo-50/50 shadow-inner' : 'hover:bg-slate-50'}`}>
          {editingId === e.id ? (
            <div className="flex flex-col gap-3"><div className="flex items-center justify-between"><span className="text-xs font-black text-indigo-600">{e.date}</span><div className="flex gap-2"><button onClick={()=>{onUpdate({...data, entries:data.entries.map((x:any)=>x.id===e.id?{...x, weight:parseFloat(tempW), bodyFat:tempF?parseFloat(tempF):undefined, photo:tempP, inbodyPhoto:tempInbody}:x)});setEditingId(null);}} className="bg-indigo-600 text-white p-2 rounded-lg shadow-sm"><Save size={16}/></button><button onClick={()=>setEditingId(null)} className="bg-slate-200 text-slate-500 p-2 rounded-lg shadow-sm"><X size={16}/></button></div></div>
              <div className="flex gap-2"><div className="flex-1"><label className="text-[10px] text-slate-400 font-bold block ml-1 uppercase">體重</label><input type="number" inputMode="decimal" value={tempW} onChange={x=>setTempW(x.target.value)} className="w-full border-2 border-indigo-200 rounded-xl p-2 font-black outline-none" /></div><div className="flex-1"><label className="text-[10px] text-slate-400 font-bold block ml-1 uppercase">體脂</label><input type="number" inputMode="decimal" value={tempF} onChange={x=>setTempF(x.target.value)} className="w-full border-2 border-indigo-200 rounded-xl p-2 font-black outline-none" /></div></div>
              {/* [NEW] 編輯模式下的照片管理 */}
              <div className="flex gap-2 mt-2">
                <div className="flex-1 p-2 bg-white rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">體態照</span>
                  {tempP ? <div className="flex gap-1"><img src={tempP} className="w-8 h-8 rounded object-cover"/><button onClick={()=>setTempP(undefined)} className="text-red-500"><XCircle size={14}/></button></div> : <button onClick={async()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(ev:any)=>setTempP(await compressImage(ev.target.files[0]));i.click();}}><Camera size={16} className="text-indigo-400"/></button>}
                </div>
                <div className="flex-1 p-2 bg-white rounded-xl border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">InBody</span>
                  {tempInbody ? <div className="flex gap-1"><img src={tempInbody} className="w-8 h-8 rounded object-cover"/><button onClick={()=>setTempInbody(undefined)} className="text-red-500"><XCircle size={14}/></button></div> : <button onClick={async()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(ev:any)=>setTempInbody(await compressImage(ev.target.files[0]));i.click();}}><FileText size={16} className="text-blue-400"/></button>}
                </div>
              </div>
            </div>
          ) : (<div className="flex items-center justify-between"><div className="flex items-center gap-4"><span className="text-xs font-bold text-slate-400 min-w-[70px]">{e.date.slice(5)}</span><span className="text-lg font-black text-slate-700 min-w-[70px]">{e.weight} kg</span>{e.bodyFat && <span className="text-sm font-bold text-slate-500">{e.bodyFat}%</span>}
            <div className="flex gap-1">
              {e.photo && <ImageIcon size={14} className="text-[#1a9478]"/>}
              {e.inbodyPhoto && <FileText size={14} className="text-blue-500"/>}
            </div>
            </div><div className="flex gap-1"><button onClick={() => { setEditingId(e.id); setTempW(e.weight.toString()); setTempF(e.bodyFat?.toString() || ''); setTempP(e.photo); setTempInbody(e.inbodyPhoto); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button><button onClick={() => { setConfirmConfig({ message: '確定刪除此紀錄？', onConfirm: () => { onUpdate({ ...data, entries: data.entries.filter((x:any)=>x.id!==e.id) }); setConfirmConfig(null); }}); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></div></div>)}
        </div>
      ))}</div></div>
    </div>
  );
};

// [分頁：訓練計畫 - 秒刪 + 單位切換 + 自定義日期 + 內嵌影片 + 智慧加組]
const StrengthLogView = ({ data, onUpdate }: any) => {
  const [date, setDate] = useState(getLocalDate());
  const [localPlan, setLocalPlan] = useState('');
  const [isAddExOpen, setIsAddExOpen] = useState(false); 
  const [isTimerOpen, setIsTimerOpen] = useState(false); 
  const [isManagePlan, setIsManagePlan] = useState(false);
  const [isLibOpen, setIsLibOpen] = useState(false);
  const [isCopy, setIsCopy] = useState(false); 
  const [showDateModal, setShowDateModal] = useState(false); 
  const [videoModal, setVideoModal] = useState<{open:boolean, url:string, title:string}>({open:false, url:'', title:''}); 
   
  const [muscle, setMuscle] = useState<string>('胸'); 
  const [exId, setExId] = useState('');
  const [newName, setNewName] = useState('');
  const [newTool, setNewTool] = useState('啞鈴');
  const [newMode, setNewMode] = useState('次數');
  const [newGym, setNewGym] = useState('');
  const [newPhoto, setNewPhoto] = useState<string|undefined>();
  const [newVideo, setNewVideo] = useState('');
   
  const [confirmConfig, setConfirmConfig] = useState<any>(null); 

  const currentPlan = localPlan || data.dailyPlans?.[date] || '';
  const todaysLogs = (data.logs || []).filter((l: any) => l.date === date);
  const todaysEx = useMemo(() => {
    const ids = Array.from(new Set(todaysLogs.map((l: any) => l.exerciseId)));
    return ids.map(id => data.exercises.find((e: any) => e.id === id)).filter(Boolean);
  }, [todaysLogs, data.exercises]);

  useEffect(() => { setLocalPlan(''); }, [date]);

  const handleSelectTemplate = (t: string) => {
    setLocalPlan(t);
    onUpdate({ ...data, dailyPlans: { ...data.dailyPlans, [date]: t }, logs: (data.logs || []).filter((l: any) => l.date !== date) });
    setTimeout(() => setIsAddExOpen(true), 200);
  };

  const handleAddNewExToLib = () => {
    if (!newName.trim()) return;
    const nid = Date.now().toString();
    const newEx = { id: nid, name: newName.trim(), muscle, mode: newMode, tool: newTool, gym: newGym, photo: newPhoto, videoUrl: newVideo, isTracked: true };
    const newLogId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    onUpdate({
      ...data,
      exercises: [...data.exercises, newEx],
      logs: [...data.logs, { id: newLogId, exerciseId: nid, date, weight: 0, reps: 8, originalWeight: 0, originalUnit: 'kg', isCompleted: false }]
    });
    setNewName(''); setNewGym(''); setNewPhoto(undefined); setNewVideo(''); setNewMode('次數');
    setIsAddExOpen(false);
  };

  const handleCopyHistory = (sourceDate: string) => {
    const sourcePlan = data.dailyPlans[sourceDate];
    if (!sourcePlan) return;
    const sourceLogs = data.logs.filter((l: any) => l.date === sourceDate);
    const newLogs = sourceLogs.map((l: any) => ({ ...l, id: Date.now().toString() + Math.random().toString(36).substr(2, 9), date: date, isCompleted: false }));
    onUpdate({ ...data, dailyPlans: { ...data.dailyPlans, [date]: sourcePlan }, logs: [...data.logs.filter((l: any) => l.date !== date), ...newLogs] });
  };

  const SwipeableRow = ({ children, onComplete }: any) => {
    const [startX, setStartX] = useState<number | null>(null);
    const [startY, setStartY] = useState<number | null>(null);
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    return (
      <div className="relative overflow-hidden rounded-xl bg-slate-800 shadow-sm"
        onTouchStart={e => {
          if ((e.target as HTMLElement).closest('button, input, select')) return;
          setStartX(e.targetTouches[0].clientX);
          setStartY(e.targetTouches[0].clientY);
        }}
        onTouchMove={e => {
          if (startX === null) return;
          const diffX = e.targetTouches[0].clientX - startX;
          const diffY = e.targetTouches[0].clientY - (startY || 0);
          if (!isSwiping && Math.abs(diffY) > Math.abs(diffX)) { setStartX(null); return; }
          setIsSwiping(true);
          if (diffX > 0 && diffX < 150) setOffsetX(diffX);
        }}
        onTouchEnd={() => {
          if (offsetX > 80) onComplete();
          setStartX(null); setStartY(null); setOffsetX(0); setIsSwiping(false);
        }}
      >
        <div className={`absolute inset-0 flex items-center pl-6 transition-colors ${offsetX > 60 ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          <CheckCircle size={28} className={`text-white transition-opacity duration-300 ${offsetX > 0 ? 'opacity-100 scale-110' : 'opacity-0'}`} />
        </div>
        <div className="relative bg-slate-800 transition-transform duration-200 ease-out" style={{ transform: `translateX(${offsetX}px)` }}>{children}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 min-h-[600px] flex flex-col">
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <DatePickerModal isOpen={showDateModal} onClose={()=>setShowDateModal(false)} currentDate={date} onSelect={setDate} />
      <VideoPlayerModal isOpen={videoModal.open} onClose={()=>setVideoModal({...videoModal, open:false})} videoUrl={videoModal.url} title={videoModal.title} />
       
      <RestTimerModal isOpen={isTimerOpen} onClose={()=>setIsTimerOpen(false)} />
      <CopyWorkoutModal isOpen={isCopy} onClose={()=>setIsCopy(false)} data={data} onCopy={handleCopyHistory} />
      <PlanManageModal isOpen={isManagePlan} onClose={()=>setIsManagePlan(false)} data={data} onUpdate={onUpdate} />
      <ExerciseLibraryModal isOpen={isLibOpen} onClose={()=>setIsLibOpen(false)} data={data} onUpdate={onUpdate} />

      <div className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-sm">
        <button onClick={()=>setShowDateModal(true)} className="flex items-center gap-2 text-slate-700 font-black"><CalendarIcon size={20} className="text-slate-400"/> {date}</button>
        {currentPlan && <button onClick={()=>{setLocalPlan(''); onUpdate({...data, dailyPlans:{...data.dailyPlans,[date]:''}});}} className="text-xs bg-red-50 text-red-600 px-4 py-2 rounded-full font-black">清空計畫</button>}
      </div>
       
      {!currentPlan ? (
        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="space-y-2"><h3 className="text-2xl font-black text-slate-800 tracking-tighter">選擇今日計畫</h3></div>
          <div className="flex flex-wrap justify-center gap-3">{(data.planTemplates||[]).map((t:any)=>(<button key={t} onClick={()=>{handleSelectTemplate(t)}} className="px-6 py-4 bg-slate-100 rounded-3xl text-sm font-black hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95">{t}</button>))}</div>
          <button onClick={()=>setIsCopy(true)} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 shadow-md border border-indigo-100"><History size={18}/> 複製歷史課表</button>
          <button onClick={()=>setIsManagePlan(true)} className="text-slate-400 text-xs font-bold underline mt-4">管理計畫模板</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10"><h3 className="font-black text-3xl uppercase">{currentPlan}</h3><p className="text-white/60 text-[10px] font-bold">右滑完成・按鈕秒刪</p></div>
            <div className="flex gap-2 z-10"><button onClick={()=>setIsLibOpen(true)} className="bg-indigo-500 p-3 rounded-2xl active:scale-90 shadow-lg"><BookOpen size={20}/></button><button onClick={()=>setIsAddExOpen(true)} className="bg-white text-indigo-600 p-3 rounded-2xl active:scale-90 shadow-lg"><Plus size={20} strokeWidth={4}/></button></div>
            <Activity className="absolute -right-4 -bottom-4 text-white/10" size={100} />
          </div>

          <div className="space-y-4">
            {todaysEx.map((ex:any)=>{
              const modeUnit = ex.mode === '秒數' ? '秒' : ex.mode === '趟數' ? '趟' : '次';
              return (
              <div key={ex.id} className="bg-slate-800 p-4 rounded-3xl shadow-xl border border-slate-700">
                <div className="flex justify-between mb-4 font-black text-white px-2">
                  <div className="flex items-center gap-2">
                    {ex.photo && <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden border border-slate-600"><img src={ex.photo} className="w-full h-full object-cover"/></div>}
                    <div>
                      <div className="flex items-center gap-1">
                        <h4>{ex.name}</h4>
                        {ex.videoUrl && <button onClick={()=>setVideoModal({open:true, url:ex.videoUrl, title:ex.name})} className="text-blue-400 hover:text-blue-300"><Video size={16}/></button>}
                      </div>
                      <div className="flex gap-1 mt-1"><span className="text-[10px] bg-slate-700 px-2 rounded text-slate-300">{ex.muscle}</span>{ex.tool && <span className="text-[10px] bg-indigo-900 text-indigo-200 px-2 rounded">{ex.tool}</span>}</div>
                    </div>
                  </div>
                </div>
                {todaysLogs.filter((l:any)=>l.exerciseId===ex.id).map((log:any, i:number)=>(
                  <div key={log.id} className="mb-2">
                    <SwipeableRow onComplete={()=>{ const up=!log.isCompleted; onUpdate({...data, logs:data.logs.map((l:any)=>l.id===log.id?{...l,isCompleted:up}:l)}); if(up)setIsTimerOpen(true); }}>
                      <div className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${log.isCompleted ? 'border-emerald-500 bg-emerald-900/20' : 'border-transparent bg-slate-700/40'}`}>
                        <span className="font-mono text-[10px] w-5 text-center text-slate-500">{log.isCompleted ? '✓' : i + 1}</span>
                        <input type="number" inputMode="decimal" value={log.originalWeight || ''} onChange={e=>{
                          const val = e.target.value; const num = val === '' ? 0 : parseFloat(val);
                          onUpdate({...data, logs:data.logs.map((l:any)=>l.id===log.id?{...l,originalWeight:num}:l)});
                        }} className="w-full bg-slate-900 rounded p-1 text-center text-white outline-none" />
                        <button onClick={(e)=>{ 
                          e.stopPropagation(); 
                          const newUnit = log.originalUnit === 'kg' ? 'lbs' : 'kg';
                          const newWeight = newUnit === 'kg' ? log.originalWeight : lbsToKg(log.originalWeight); 
                          onUpdate({...data, logs: data.logs.map((l:any)=>l.id===log.id ? {...l, originalUnit: newUnit, weight: newWeight} : l)});
                        }} className="text-[10px] bg-slate-900 text-slate-500 font-bold px-2 py-1 rounded uppercase hover:text-indigo-400 active:scale-95 transition-all">{log.originalUnit}</button>
                        <div className="flex items-center w-full bg-slate-900 rounded pr-2">
                          <input type="number" inputMode="numeric" pattern="[0-9]*" value={log.reps || ''} onChange={e=>{
                            const val = e.target.value; const num = val === '' ? 0 : parseInt(val);
                            onUpdate({...data, logs:data.logs.map((l:any)=>l.id===log.id?{...l,reps:num}:l)});
                          }} className="w-full bg-transparent p-1 text-center text-white outline-none" />
                          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">{modeUnit}</span>
                        </div>
                        <div className="flex gap-1" onTouchStart={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}>
                          <button onClick={(e)=>{ e.stopPropagation(); onUpdate({...data, logs:[...data.logs, {...log, id:Date.now().toString()+Math.random(), isCompleted:false}]}); }} className="p-2 text-slate-400 hover:text-white"><Copy size={16}/></button>
                          <button onClick={(e)=>{ e.stopPropagation(); onUpdate({...data, logs: data.logs.filter((l:any) => String(l.id) !== String(log.id))}); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    </SwipeableRow>
                  </div>
                ))}
                 
                {/* [修正] 加一組按鈕邏輯：自動帶入上一組的數據 */}
                <button onClick={()=>{
                  const currentExLogs = todaysLogs.filter((l:any) => l.exerciseId === ex.id);
                  const lastLog = currentExLogs.length > 0 ? currentExLogs[currentExLogs.length - 1] : null;
                  
                  const nextWeight = lastLog ? lastLog.originalWeight : 0;
                  const nextReps = lastLog ? lastLog.reps : 8;
                  const nextUnit = lastLog ? lastLog.originalUnit : 'kg';

                  onUpdate({
                    ...data, 
                    logs: [...data.logs, {
                      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
                      exerciseId: ex.id, 
                      date, 
                      weight: nextUnit === 'kg' ? nextWeight : lbsToKg(nextWeight), 
                      reps: nextReps, 
                      originalWeight: nextWeight, 
                      originalUnit: nextUnit, 
                      isCompleted: false
                    }]
                  });
                }} className="w-full mt-2 py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 text-xs font-black">+ 加一組</button>
              </div>
            );})}
            <button onClick={()=>setIsAddExOpen(true)} className="w-full bg-indigo-600 text-white p-10 rounded-[2.5rem] font-black text-xl shadow-2xl flex flex-col items-center gap-2 active:scale-95 transition-all"><PlusCircle size={40}/><span>新增動作</span></button>
          </div>
        </div>
      )}

      {isAddExOpen && (
        <div className="fixed inset-0 z-[110000] bg-slate-900 flex flex-col p-6 animate-in slide-in-from-bottom">
          <div className="flex justify-between items-center mb-6 text-white"><h3 className="text-2xl font-black flex items-center gap-2"><PlusCircle className="text-indigo-400"/> 選擇訓練</h3><button onClick={()=>setIsAddExOpen(false)}><X size={32}/></button></div>
          <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar">{['胸','背','肩','腿','手','腹'].map(m=>(<button key={m} onClick={()=>setMuscle(m)} className={`px-8 py-4 rounded-3xl font-black transition-all ${muscle===m?'bg-indigo-500 text-white shadow-xl scale-105':'bg-slate-800 text-slate-500'}`}>{m}</button>))}</div>
          <div className="space-y-6 bg-slate-800 p-6 rounded-[2rem] border border-slate-700 overflow-y-auto max-h-[70vh]">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold ml-2">從現有清單選擇：</label>
              <select value={exId} onChange={e=>setExId(e.target.value)} className="w-full bg-slate-900 border-none rounded-2xl p-5 text-lg text-white outline-none">
                <option value="">-- 請選擇動作 --</option>
                {data.exercises.filter((e:any)=>e.muscle===muscle && e.isTracked !== false).map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              {exId && <button onClick={()=>{ 
                // [修正] 選既有動作時，也帶入上一組邏輯
                const currentExLogs = todaysLogs.filter((l:any) => l.exerciseId === exId);
                const lastLog = currentExLogs.length > 0 ? currentExLogs[currentExLogs.length - 1] : null;
                const nextWeight = lastLog ? lastLog.originalWeight : 0;
                const nextReps = lastLog ? lastLog.reps : 8;
                const nextUnit = lastLog ? lastLog.originalUnit : 'kg';

                onUpdate({
                  ...data, 
                  logs:[...data.logs, {
                    id:Date.now().toString()+Math.random(), 
                    exerciseId:exId, 
                    date, 
                    weight: nextUnit === 'kg' ? nextWeight : lbsToKg(nextWeight), 
                    reps: nextReps, 
                    originalWeight: nextWeight, 
                    originalUnit: nextUnit, 
                    isCompleted:false
                  }]
                }); 
                setIsAddExOpen(false); setExId(''); 
              }} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black mt-2">加入此動作</button>}
            </div>
            <div className="relative flex items-center py-2"><div className="flex-grow border-t border-slate-700"></div><span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase">建立新動作</span><div className="flex-grow border-t border-slate-700"></div></div>
            <div className="space-y-3">
              <input placeholder="動作名稱 (e.g. 啞鈴臥推)" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full bg-slate-900 border-none rounded-2xl p-4 text-white outline-none focus:ring-2 ring-indigo-500" />
              <div className="grid grid-cols-2 gap-2">
                <select value={newTool} onChange={e=>setNewTool(e.target.value)} className="bg-slate-900 text-white p-4 rounded-2xl outline-none text-sm font-bold">{TOOLS.map(t=><option key={t} value={t}>{t}</option>)}</select>
                <select value={newMode} onChange={e=>setNewMode(e.target.value)} className="bg-slate-900 text-white p-4 rounded-2xl outline-none text-sm font-bold">{TRAIN_MODES.map(m=><option key={m} value={m}>{m}</option>)}</select>
              </div>
              <input placeholder="健身房 (選填)" value={newGym} onChange={e=>setNewGym(e.target.value)} className="w-full bg-slate-900 text-white p-4 rounded-2xl outline-none text-sm" />
              <input placeholder="教學影片連結 (YouTube/IG)..." value={newVideo} onChange={e=>setNewVideo(e.target.value)} className="w-full bg-slate-900 text-white p-4 rounded-2xl outline-none text-sm" />
              <button onClick={async()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=async(ev:any)=>setNewPhoto(await compressImage(ev.target.files[0]));i.click();}} className={`w-full p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-2 ${newPhoto?'border-emerald-500 text-emerald-400':'border-slate-600 text-slate-400'}`}>{newPhoto ? <><Check size={18}/> 照片已就緒</> : <><Camera size={18}/> 上傳動作照片</>}</button>
              <button onClick={handleAddNewExToLib} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg">永久新增並使用</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- [6. 訓練分析視圖] ---

const StrengthAnalysisView = ({ data, onManage }: any) => {
  const [muscle, setMuscle] = useState('all');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const filteredData = useMemo(() => {
    if (!data.exercises || !data.logs) return [];
    return data.exercises.filter((ex: any) => {
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (muscle !== 'all' && ex.muscle !== muscle) return false;
      if (planFilter !== 'all') {
        const relevantDates = Object.keys(data.dailyPlans || {}).filter(d => data.dailyPlans[d] === planFilter);
        if (!data.logs.some((l: any) => l.exerciseId === ex.id && relevantDates.includes(l.date))) return false;
      }
      return ex.isTracked !== false;
    })
    .map((ex: any) => {
      const logs = data.logs.filter((l: any) => l.exerciseId === ex.id);
      const dailyMax = logs.reduce((acc: any, l: any) => {
        const rm = calculate1RM(l.weight, l.reps);
        if (!acc[l.date] || rm > acc[l.date].rm) acc[l.date] = { date: l.date, rm: parseFloat(rm.toFixed(1)) };
        return acc;
      }, {});
      const chartPoints = Object.values(dailyMax).sort((a: any, b: any) => a.date.localeCompare(b.date));
      return { ...ex, chartPoints, pr: chartPoints.length > 0 ? Math.max(...(chartPoints as any[]).map(c => c.rm)) : 0 };
    })
    .filter((ex: any) => ex.chartPoints.length > 0);
  }, [data, muscle, search, planFilter]);

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
        <h3 className="font-black text-slate-700 flex items-center gap-2"><ChartIcon size={18} className="text-indigo-600"/> 訓練進度分析</h3>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
          <input placeholder="搜尋動作名稱..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-50 border-none p-4 pl-12 rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-indigo-500/20" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select value={muscle} onChange={e => setMuscle(e.target.value)} className="bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none appearance-none"><option value="all">所有部位</option>{['胸','背','肩','腿','手','腹'].map(m => <option key={m} value={m}>{m}</option>)}</select>
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="bg-slate-50 p-3 rounded-xl font-bold text-sm outline-none appearance-none"><option value="all">所有計畫</option>{(data.planTemplates || []).map((t: string) => <option key={t} value={t}>{t}</option>)}</select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredData.map((ex: any) => (
          <div key={ex.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative group transition-all hover:shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2">
                {ex.photo && <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border"><img src={ex.photo} className="w-full h-full object-cover"/></div>}
                <div><h3 className="font-black text-lg text-slate-800 tracking-tight">{ex.name}</h3><div className="flex gap-1"><span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{ex.muscle}</span>{ex.tool && <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded font-bold">{ex.tool}</span>}</div></div>
              </div>
              <div className="text-right"><div className="text-[10px] text-slate-400 font-black tracking-tighter uppercase">PR (1RM)</div><div className="text-indigo-600 font-black text-2xl leading-none">{ex.pr} <span className="text-xs">kg</span></div></div>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ex.chartPoints}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="date" type="category" hide /> 
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                  <Tooltip labelFormatter={(label) => `日期: ${label}`} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="rm" stroke="#6366f1" strokeWidth={4} dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <button onClick={() => onManage(ex.id)} className="absolute top-4 right-1/2 translate-x-1/2 text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all border shadow-sm active:scale-95">管理數據</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- [7. App 主程式進入點] ---

const BodyGoalPro = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(DEFAULT_DATA);
  const [activeTab, setActiveTab] = useState<'body' | 'log' | 'analysis' | 'strength_analysis'>('body');
  const [confirmConfig, setConfirmConfig] = useState<any>(null); 
   
  const [manageExId, setManageExId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // [NEW] 控制個人檔案彈窗

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const dataPath = user ? doc(db, 'users', user.uid, 'fitness_data', 'master') : doc(db, 'my_data', 'master_sheet');
    const unsub = onSnapshot(dataPath, snap => {
      if (snap.exists()) setUserData(snap.data());
      else setUserData(DEFAULT_DATA);
    });
    return () => unsub();
  }, [authLoading, user]);

  const updateData = async (newData: any) => {
    setUserData(newData);
    const dataPath = user ? doc(db, 'users', user.uid, 'fitness_data', 'master') : doc(db, 'my_data', 'master_sheet');
    await setDoc(dataPath, JSON.parse(JSON.stringify(newData)));
  };

  if (authLoading) return (<div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-black text-slate-300 tracking-widest"><Loader2 className="animate-spin mb-4 text-indigo-600" size={40}/>SYNCING...</div>);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-100">
      <style>{GLOBAL_STYLE}</style>
       
      <UserProfileModal isOpen={isProfileOpen} onClose={()=>setIsProfileOpen(false)} data={userData} onUpdate={updateData} />
      <ConfirmationModal isOpen={!!confirmConfig} message={confirmConfig?.message} onConfirm={confirmConfig?.onConfirm} onCancel={()=>setConfirmConfig(null)} />
      <DataTransferModal isOpen={isExportOpen} type="export" data={userData} onClose={()=>setIsExportOpen(false)} />
      <DataTransferModal isOpen={isImportOpen} type="import" onImport={updateData} onClose={()=>setIsImportOpen(false)} />
      <HistoryManagementModal isOpen={!!manageExId} targetId={manageExId} onClose={()=>setManageExId(null)} data={userData} onUpdate={updateData} />
       
      <header className="bg-white p-4 sticky top-0 z-50 shadow-sm border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200"><Activity size={20}/></div>
          <h1 className="text-lg font-black tracking-tighter uppercase">BODYGOAL PRO</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={()=>setIsExportOpen(true)} className="p-2 text-indigo-600 active:scale-110 transition-transform"><Upload size={18}/></button>
          <button onClick={()=>setIsImportOpen(true)} className="p-2 text-emerald-600 active:scale-110 transition-transform"><Cloud size={18}/></button>
          <button onClick={()=>{ if(user){ setConfirmConfig({ message: '確定要登出嗎？', onConfirm: () => { signOut(auth); setConfirmConfig(null); }}); } else signInWithPopup(auth, provider); }} className={`p-2 transition-transform hover:scale-110 ${user ? 'text-orange-500' : 'text-slate-300'}`}>{user ? <LogOut size={18}/> : <User size={18}/>}</button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        {activeTab === 'body' && <BodyMetricsView data={userData} onUpdate={updateData} />}
        {activeTab === 'analysis' && <BodyAnalysisView data={userData} onUpdate={updateData} />}
        {activeTab === 'log' && <StrengthLogView data={userData} onUpdate={updateData} />}
        {activeTab === 'strength_analysis' && <StrengthAnalysisView data={userData} onManage={setManageExId} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t pb-safe z-[10000] flex justify-around shadow-2xl">
        <button onClick={()=>setActiveTab('body')} className={`flex-1 py-4 flex flex-col items-center text-[10px] font-black ${activeTab==='body'?'text-teal-600 scale-110':'text-slate-400'}`}><Ruler size={22} strokeWidth={3}/><span className="mt-1">體態紀錄</span></button>
        <button onClick={()=>setActiveTab('analysis')} className={`flex-1 py-4 flex flex-col items-center text-[10px] font-black ${activeTab==='analysis'?'text-orange-500 scale-110':'text-slate-400'}`}><ImageIcon size={22} strokeWidth={3}/><span className="mt-1">體態分析</span></button>
        <button onClick={()=>setActiveTab('log')} className={`flex-1 py-4 flex flex-col items-center text-[10px] font-black ${activeTab==='log'?'text-indigo-600 scale-110':'text-slate-400'}`}><Dumbbell size={22} strokeWidth={3}/><span className="mt-1">訓練計畫</span></button>
        <button onClick={()=>setActiveTab('strength_analysis')} className={`flex-1 py-4 flex flex-col items-center text-[10px] font-black ${activeTab==='strength_analysis'?'text-violet-600 scale-110':'text-slate-400'}`}><ChartIcon size={22} strokeWidth={3}/><span className="mt-1">分析進度</span></button>
      </nav>
    </div>
  );
};

export default BodyGoalPro;

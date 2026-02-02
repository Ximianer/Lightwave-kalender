/**
 * LIGHTWAVE ERP - PROFESSIONAL EDITION V8.6
 * -----------------------------------------
 * - FIX: NaN-Warnung in der Bestandsliste durch explizite Typkonvertierung behoben.
 * - NEU: Dynamische Bundle-Verwaltung.
 * - STORAGE: Firestore Integration für Events, Inventory, Users und Bundles.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Zap, Plus, LogOut, X, ClipboardList, Trash2, Edit3,
  Wrench, MapPin, ChevronRight, LayoutGrid, Box, Save, Layers, PackagePlus
} from 'lucide-react';

// --- FIREBASE SETUP ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'lightwave-erp-v8';

const ROLES = {
  CHEF: 'Hauptchef',
  PROJECT_LEAD: 'Projektleiter',
  TECH: 'Techniker',
  LOGISTICS: 'Lagerist'
};

// --- HELPERS ---
const formatCurrency = (num) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(num || 0);
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('de-DE') : '---';
const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--';
const sanitize = (obj) => JSON.parse(JSON.stringify(obj, (k, v) => v === undefined ? null : v));

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [users, setUsers] = useState([]);
  const [customBundles, setCustomBundles] = useState([]);

  const [view, setView] = useState('timeline');
  const [subView, setSubView] = useState('list');
  const [modals, setModals] = useState({ event: null, item: false, user: false, editEvent: null, bundle: false });
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error(e); }
    };
    init();
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    const qEvents = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const qInv = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const qUsers = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const qBundles = collection(db, 'artifacts', appId, 'public', 'data', 'bundles');

    const unsubs = [
      onSnapshot(qEvents, s => setEvents(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e)),
      onSnapshot(qInv, s => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e)),
      onSnapshot(qUsers, s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e)),
      onSnapshot(qBundles, s => setCustomBundles(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e))
    ];
    return () => unsubs.forEach(fn => fn());
  }, [user]);

  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    if (loginForm.user.toLowerCase() === 'admin' && loginForm.pass === '123') {
      setCurrentUser({ id: 'ADMIN', username: 'Administrator', role: ROLES.CHEF });
      setIsLoggedIn(true);
      return;
    }
    const found = users.find(u => u.username?.toLowerCase() === loginForm.user.toLowerCase() && u.password === loginForm.pass);
    if (found) { setCurrentUser(found); setIsLoggedIn(true); } 
    else { setError('Zugriff verweigert.'); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Dieses Event wirklich löschen?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
    setModals({ ...modals, event: null });
  };

  const deleteBundle = async (id) => {
    if (!window.confirm("Dieses Bundle wirklich löschen?")) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'bundles', id));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse uppercase tracking-[0.2em]">Systemstart...</div>;

  if (!isLoggedIn) return (
    <div className="h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="bg-slate-900 p-10 rounded-[3rem] border border-slate-800 shadow-2xl w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 rotate-3">
            <Zap className="text-white" size={40} fill="currentColor" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-center text-white mb-2 tracking-tighter uppercase italic">Lightwave <span className="text-indigo-500">ERP</span></h1>
        <p className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-[0.3em] mb-10">Professional Access V8.6</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input className="w-full bg-slate-800 border-none p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-indigo-500 transition-all" placeholder="BENUTZER" value={loginForm.user} onChange={e => setLoginForm({...loginForm, user: e.target.value})} />
          <input className="w-full bg-slate-800 border-none p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-indigo-500 transition-all" type="password" placeholder="PASSWORT" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
          {error && <p className="text-red-400 text-[10px] font-black uppercase text-center">{error}</p>}
          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-500/20 uppercase text-xs tracking-widest hover:bg-indigo-500 active:scale-95 transition-all">Anmelden</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32 font-sans">
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-40 border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <Zap className="text-white" size={20} fill="currentColor" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tighter uppercase block leading-none">Lightwave</span>
            <span className="text-[8px] font-black uppercase text-indigo-600 tracking-widest">{currentUser.role}</span>
          </div>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="p-3 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
          <LogOut size={20}/>
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
        {view === 'timeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-black tracking-tighter uppercase italic">Zeitplan</h2>
              {currentUser.role === ROLES.CHEF && (
                <button onClick={() => setModals({...modals, editEvent: { new: true }})} className="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-200 hover:scale-110 active:scale-90 transition-all">
                  <Plus size={24}/>
                </button>
              )}
            </div>
            <div className="grid gap-4">
              {events.sort((a,b) => new Date(a.eventStart) - new Date(b.eventStart)).map(ev => (
                <div key={ev.id} onClick={() => setModals({...modals, event: ev})} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer transition-all flex justify-between items-center group">
                  <div className="flex gap-6 items-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border group-hover:bg-indigo-50 transition-colors">
                      <span className="text-[10px] font-black text-slate-400 uppercase leading-none">{new Date(ev.eventStart).toLocaleString('de-DE', { month: 'short' })}</span>
                      <span className="text-2xl font-black text-slate-900">{new Date(ev.eventStart).getDate()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">{ev.title}</h3>
                      <p className="text-xs font-bold text-slate-400 flex items-center gap-1"><MapPin size={12}/> {ev.location}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-all" />
                </div>
              ))}
              {events.length === 0 && <div className="text-center py-20 text-slate-300 font-bold uppercase tracking-widest border-2 border-dashed rounded-[3rem]">Keine Termine</div>}
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-6">
            <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto">
              <button onClick={() => setSubView('list')} className={`flex-1 min-w-[100px] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${subView === 'list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Material</button>
              <button onClick={() => setSubView('bundles')} className={`flex-1 min-w-[100px] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${subView === 'bundles' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Bundles</button>
              <button onClick={() => setSubView('team')} className={`flex-1 min-w-[100px] py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${subView === 'team' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>Team</button>
            </div>
            
            {subView === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentUser.role === ROLES.CHEF && (
                  <button onClick={() => setModals({...modals, item: true})} className="md:col-span-2 py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all">+ Neue Hardware</button>
                )}
                {inventory.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-black uppercase text-slate-800">{item.name}</p>
                      <div className="flex gap-3 mt-1">
                        {/* FIX: Sicherstellen, dass stock immer eine Zahl ist und niemals NaN im Attribut landet */}
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{Number(item.stock || 0).toString()} STK</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatCurrency(item.rentPrice)}</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300"><Box size={24}/></div>
                  </div>
                ))}
              </div>
            )}

            {subView === 'bundles' && (
              <div className="grid grid-cols-1 gap-4">
                {currentUser.role === ROLES.CHEF && (
                  <button onClick={() => setModals({...modals, bundle: true})} className="py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-indigo-600 hover:border-indigo-200 transition-all">+ Neues Bundle erstellen</button>
                )}
                {customBundles.map(bundle => (
                  <div key={bundle.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Layers size={24}/></div>
                       <div>
                         <p className="font-black uppercase text-slate-800">{bundle.name}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">{bundle.items?.length || 0} Komponenten enthalten</p>
                       </div>
                    </div>
                    {currentUser.role === ROLES.CHEF && (
                      <button onClick={() => deleteBundle(bundle.id)} className="p-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {subView === 'team' && (
              <div className="grid gap-4">
                {currentUser.role === ROLES.CHEF && (
                  <button onClick={() => setModals({...modals, user: true})} className="py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-black uppercase text-xs tracking-[0.2em] hover:bg-white hover:text-indigo-600 transition-all">+ Crew Mitglied</button>
                )}
                {users.map(u => (
                  <div key={u.id} className="bg-white p-5 rounded-[2rem] border flex items-center gap-5 shadow-sm">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">{u.username?.charAt(0).toUpperCase()}</div>
                    <div>
                      <p className="font-black uppercase text-slate-800 leading-tight">{u.username}</p>
                      <p className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">{u.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] p-2 flex gap-2 z-50">
        {[
          { id: 'timeline', icon: LayoutGrid, label: 'Planer' },
          { id: 'inventory', icon: Wrench, label: 'Assets' }
        ].map(btn => (
          <button key={btn.id} onClick={() => setView(btn.id)} className={`flex flex-col items-center px-8 py-3 rounded-[2rem] transition-all duration-500 ${view === btn.id ? 'bg-slate-900 text-white scale-105 shadow-2xl' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            <btn.icon size={22} />
            {view === btn.id && <span className="text-[8px] font-black uppercase tracking-widest mt-1.5">{btn.label}</span>}
          </button>
        ))}
      </div>

      {/* Modals */}
      {modals.event && (
        <EventDetailModal 
          event={modals.event} 
          onClose={() => setModals({...modals, event: null})} 
          onDelete={deleteEvent}
          onEdit={() => setModals({...modals, editEvent: modals.event, event: null})}
          isAdmin={currentUser.role === ROLES.CHEF}
        />
      )}

      {modals.editEvent && (
        <EventEditorModal 
          event={modals.editEvent} 
          inventory={inventory}
          customBundles={customBundles}
          users={users}
          onClose={() => setModals({...modals, editEvent: null})} 
          onSave={async (d) => {
            const dataToSave = sanitize(d);
            if (d.id) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', d.id), dataToSave); }
            else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), dataToSave); }
            setModals({...modals, editEvent: null});
          }}
        />
      )}

      {modals.bundle && (
        <BundleCreatorModal 
          inventory={inventory}
          onClose={() => setModals({...modals, bundle: false})}
          onSave={async (d) => {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'bundles'), sanitize(d));
            setModals({...modals, bundle: false});
          }}
        />
      )}

      {modals.item && (
        <ItemModal onClose={() => setModals({...modals, item: false})} onSave={async (d) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), sanitize(d)); setModals({...modals, item: false}); }} />
      )}

      {modals.user && (
        <UserModal onClose={() => setModals({...modals, user: false})} onSave={async (d) => { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), d); setModals({...modals, user: false}); }} />
      )}
    </div>
  );
}

// --- SUB-KOMPONENTEN ---

function BundleCreatorModal({ inventory, onClose, onSave }) {
  const [name, setName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

  const toggleItem = (item) => {
    const exist = selectedItems.find(i => i.name === item.name);
    if (exist) {
      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
    } else {
      setSelectedItems([...selectedItems, { name: item.name, quantity: 1, price: item.rentPrice || 0 }]);
    }
  };

  const updateQty = (name, q) => {
    setSelectedItems(selectedItems.map(i => i.name === name ? { ...i, quantity: Math.max(1, q) } : i));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[150] flex items-center justify-center p-6">
       <div className="bg-white w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-3xl font-black uppercase tracking-tighter italic">Bundle <span className="text-indigo-600">Designer</span></h3>
             <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl"><X size={20}/></button>
          </div>
          
          <div className="space-y-6 flex-1 overflow-y-auto pr-2">
             <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Name des Bundles</label>
                <input className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-lg outline-none focus:ring-2 ring-indigo-100" placeholder="z.B. HOCHZEIT TON BASIS" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
             </div>

             <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Inhalt definieren</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {inventory.map(item => {
                     const isSel = selectedItems.find(i => i.name === item.name);
                     return (
                       <div key={item.id} className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${isSel ? 'border-indigo-600 bg-indigo-50' : 'bg-white border-slate-100'}`}>
                          <button onClick={() => toggleItem(item)} className="flex-1 text-left">
                            <p className="text-[10px] font-black uppercase">{item.name}</p>
                          </button>
                          {isSel && (
                            <input type="number" className="w-12 bg-white border-none text-center font-black rounded-lg text-xs" value={isSel.quantity} onChange={e => updateQty(item.name, parseInt(e.target.value))} />
                          )}
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>

          <div className="pt-8 border-t mt-6">
             <button onClick={() => name && selectedItems.length > 0 && onSave({ name, items: selectedItems })} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3">
                <PackagePlus size={20}/> Bundle Speichern
             </button>
          </div>
       </div>
    </div>
  );
}

function EventDetailModal({ event, onClose, onDelete, onEdit, isAdmin }) {
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="bg-white w-full max-w-2xl sm:rounded-[3rem] h-[90vh] sm:h-auto overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
        <div className="p-8 border-b flex justify-between items-center">
          <div className="bg-indigo-50 px-4 py-1 rounded-full"><span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest italic">Event-ID: {event.id?.slice(-6)}</span></div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl hover:rotate-90 transition-all"><X size={20}/></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-32">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-[0.9]">{event.title}</h2>
            <p className="flex items-center justify-center sm:justify-start gap-2 text-slate-400 font-bold uppercase text-xs tracking-widest"><MapPin size={16} className="text-indigo-500"/> {event.location}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {l: 'Aufbau', t: event.setupStart}, {l: 'Start', t: event.eventStart},
              {l: 'Ende', t: event.eventEnd}, {l: 'Abbau', t: event.teardownEnd}
            ].map((time, i) => (
              <div key={i} className="bg-slate-50 p-4 rounded-3xl border text-center">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-2 tracking-tighter">{time.l}</p>
                <p className="text-lg font-black text-slate-800">{formatTime(time.t)}</p>
                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">{formatDate(time.t)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 border-b pb-4"><ClipboardList size={18} className="text-indigo-600"/> Technik-Anforderung</h4>
            <div className="grid gap-3">
              {event.bookedItems?.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><Box size={16} className="text-slate-400"/></div>
                    <span className="font-black text-sm text-slate-800 uppercase italic">{item.name}</span>
                  </div>
                  <span className="bg-slate-900 text-white font-black px-4 py-1.5 rounded-xl text-[10px] shadow-lg shadow-slate-200">{Number(item.quantity || 0)} UNITS</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 border-t bg-slate-50/50 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Budget</span>
             <p className="text-2xl font-black text-slate-900">{formatCurrency(event.totalPrice)}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <button onClick={onEdit} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"><Edit3 size={16}/> Bearbeiten</button>
              <button onClick={() => onDelete(event.id)} className="bg-white text-red-500 border border-red-100 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-red-50 transition-all"><Trash2 size={16}/> Löschen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventEditorModal({ event, inventory, customBundles, users, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(event.new ? { 
    title: '', location: '', setupStart: '', eventStart: '', eventEnd: '', teardownEnd: '', bookedItems: [], assignedUsers: [] 
  } : { ...event });

  const totalPrice = useMemo(() => form.bookedItems.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.quantity || 0)), 0), [form.bookedItems]);

  const addBundle = (bundle) => {
    setForm(prev => {
      const newBooked = [...prev.bookedItems];
      bundle.items.forEach(bundleItem => {
        const existing = newBooked.find(i => i.name === bundleItem.name);
        if (existing) {
          existing.quantity = Number(existing.quantity) + Number(bundleItem.quantity);
        } else {
          newBooked.push({ ...bundleItem, id: 'bundle-' + Math.random().toString(36).substr(2, 5) });
        }
      });
      return { ...prev, bookedItems: newBooked };
    });
  };

  return (
    <div className="fixed inset-0 bg-white z-[110] flex flex-col">
      <header className="p-8 border-b flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-tighter italic">Mission <span className="text-indigo-600">Control</span></h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Schritt {step} von 2 — Konfiguration</p>
        </div>
        <button onClick={onClose} className="p-4 bg-slate-100 rounded-[2rem] text-slate-400 hover:rotate-90 transition-all"><X size={24}/></button>
      </header>

      <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full space-y-12">
        {step === 1 && (
          <div className="space-y-10">
            <div className="space-y-6">
              <input className="w-full text-5xl font-black uppercase tracking-tighter border-none p-0 focus:ring-0 outline-none placeholder:text-slate-100 transition-all text-slate-900 italic" placeholder="EVENT NAME" value={form.title} onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} />
              <input className="w-full font-black text-indigo-500 uppercase tracking-widest text-sm border-none p-0 focus:ring-0 outline-none placeholder:text-indigo-100" placeholder="ORT / BASE" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Aufbau Start', key: 'setupStart' },
                { label: 'Event Start', key: 'eventStart' },
                { label: 'Event Ende', key: 'eventEnd' },
                { label: 'Abbau Ende', key: 'teardownEnd' }
              ].map(f => (
                <div key={f.key} className="bg-slate-50 p-6 rounded-[2rem] border-2 border-transparent focus-within:border-indigo-100 transition-all">
                  <label className="text-[9px] font-black uppercase text-slate-400 block mb-2 tracking-[0.2em]">{f.label}</label>
                  <input type="datetime-local" className="bg-transparent font-black w-full text-base outline-none cursor-pointer text-slate-800" value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} />
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Crew Auswahl</label>
              <div className="flex flex-wrap gap-3">
                {users.map(u => (
                  <button key={u.id} onClick={() => setForm(f => ({...f, assignedUsers: f.assignedUsers.includes(u.id) ? f.assignedUsers.filter(id => id !== u.id) : [...f.assignedUsers, u.id]}))} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${form.assignedUsers.includes(u.id) ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-105' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>{u.username}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 pb-20">
            {customBundles.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Material-Bundles (Pakete)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {customBundles.map(bundle => (
                      <button key={bundle.id} onClick={() => addBundle(bundle)} className="bg-indigo-50 border border-indigo-100 p-4 rounded-3xl hover:bg-indigo-600 hover:text-white transition-all group flex items-center gap-3 text-left">
                        <div className="bg-white p-2 rounded-xl text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                          <Layers size={18}/>
                        </div>
                        <span className="text-[9px] font-black uppercase">{bundle.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b pb-4 mt-12">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Einzel-Hardware Pool</h4>
              <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg">Bestand</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inventory.map(item => {
                const booked = form.bookedItems.find(i => i.name === item.name)?.quantity || 0;
                const stockVal = Number(item.stock || 0);
                const isMax = booked >= stockVal;
                return (
                  <div key={item.id} className={`p-6 rounded-[2.5rem] border-2 transition-all ${booked > 0 ? 'border-indigo-500 bg-indigo-50/30 shadow-lg' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-black uppercase text-sm tracking-tighter text-slate-800 italic">{item.name}</p>
                        <p className="text-[9px] font-black text-slate-400 mt-1">BESTAND: <span className={isMax ? 'text-red-500' : 'text-indigo-600'}>{Number(booked)} / {stockVal}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        {booked > 0 && <button onClick={() => setForm(f => ({
                          ...f, 
                          bookedItems: f.bookedItems.map(bi => bi.name === item.name ? {...bi, quantity: bi.quantity - 1} : bi).filter(bi => bi.quantity > 0)
                        }))} className="w-10 h-10 bg-white border shadow-sm rounded-xl flex items-center justify-center font-black active:scale-90">-</button>}
                        
                        {!isMax && <button onClick={() => {
                          const exist = form.bookedItems.find(bi => bi.name === item.name);
                          if (exist) {
                            setForm(f => ({...f, bookedItems: f.bookedItems.map(bi => bi.name === item.name ? {...bi, quantity: bi.quantity + 1} : bi)}));
                          } else {
                            setForm(f => ({...f, bookedItems: [...form.bookedItems, { id: item.id, name: item.name, quantity: 1, price: item.rentPrice || 0 }]}));
                          }
                        }} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black active:scale-90 shadow-xl">+</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-indigo-600 p-10 rounded-[3rem] flex flex-col sm:flex-row justify-between items-center gap-6 shadow-2xl shadow-indigo-200 border-4 border-white mt-12">
              <div className="text-center sm:text-left">
                <p className="text-[9px] font-black uppercase text-indigo-100 tracking-[0.4em] mb-2">Projekt-Kosten</p>
                <p className="text-5xl font-black text-white tracking-tighter">{formatCurrency(totalPrice)}</p>
              </div>
              <button onClick={() => { if(!form.title) return; onSave({...form, totalPrice}); }} disabled={!form.title} className="bg-white text-indigo-600 px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-3 active:scale-95">
                <Save size={18}/> Mission Speichern
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="p-8 bg-slate-50 border-t flex gap-4 sticky bottom-0">
        {step > 1 && <button onClick={() => setStep(s => s - 1)} className="px-10 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest hover:text-slate-900 transition-colors">Zurück</button>}
        {step < 2 && (
          <button onClick={() => setStep(2)} disabled={!form.title} className="flex-1 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl disabled:opacity-50 hover:bg-indigo-600 transition-all">Weiter zur Planung</button>
        )}
      </footer>
    </div>
  );
}

function ItemModal({ onClose, onSave }) {
  const [f, setF] = useState({ name: '', rentPrice: '', stock: 1 });
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6 animate-in zoom-in">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl">
        <h3 className="text-2xl font-black uppercase mb-8 italic tracking-tighter">Neue <span className="text-indigo-600">Hardware</span></h3>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none focus:ring-2 ring-indigo-100" placeholder="BEZEICHNUNG" value={f.name} onChange={e => setF({...f, name: e.target.value.toUpperCase()})} />
          <div className="grid grid-cols-2 gap-4">
            <input type="number" className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-[10px]" placeholder="PREIS €" value={f.rentPrice} onChange={e => setF({...f, rentPrice: e.target.value})} />
            <input type="number" className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-[10px]" placeholder="STOCK" value={f.stock} onChange={e => setF({...f, stock: parseInt(e.target.value) || 0})} />
          </div>
          <button onClick={() => { if(!f.name) return; onSave({...f, rentPrice: parseFloat(f.rentPrice || 0)})}} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl mt-6 hover:bg-indigo-600 transition-all">Speichern</button>
          <button onClick={onClose} className="w-full text-slate-400 font-black uppercase text-[8px] tracking-[0.4em] mt-2">Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

function UserModal({ onClose, onSave }) {
  const [f, setF] = useState({ username: '', password: '', role: 'Techniker' });
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[120] flex items-center justify-center p-6 animate-in zoom-in">
      <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl">
        <h3 className="text-2xl font-black uppercase mb-8 italic tracking-tighter">Neue <span className="text-indigo-600">Identität</span></h3>
        <div className="space-y-4">
          <input className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-[10px] tracking-widest uppercase outline-none focus:ring-2 ring-indigo-100" placeholder="BENUTZERNAME" value={f.username} onChange={e => setF({...f, username: e.target.value})} />
          <input className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-[10px] outline-none" type="password" placeholder="PASSWORT" value={f.password} onChange={e => setF({...f, password: e.target.value})} />
          <select className="w-full bg-slate-50 border-none p-5 rounded-2xl font-black text-[10px] uppercase" value={f.role} onChange={e => setF({...f, role: e.target.value})}>
            {Object.values(ROLES).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={() => onSave(f)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6">Hinzufügen</button>
          <button onClick={onClose} className="w-full text-slate-400 font-black uppercase text-[8px] tracking-[0.4em] mt-2">Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
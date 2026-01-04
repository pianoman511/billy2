
import React, { useState, useEffect } from 'react';
import { Pill, Plus, Trash2, Clock, Info, User } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';
import { Medication } from '../types';

const MedicinePlanner: React.FC = () => {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', patientName: '', dosage: '', time: '', notes: '' });

  useEffect(() => {
    const saved = localStorage.getItem('assistme_meds');
    if (saved) setMeds(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('assistme_meds', JSON.stringify(meds));
  }, [meds]);

  const addMed = () => {
    if (!formData.name || !formData.time || !formData.patientName) return;
    const newMed: Medication = {
      ...formData,
      id: Date.now().toString()
    };
    setMeds([...meds, newMed]);
    setFormData({ name: '', patientName: '', dosage: '', time: '', notes: '' });
    setIsAdding(false);
  };

  const removeMed = (id: string) => {
    setMeds(meds.filter(m => m.id !== id));
  };

  return (
    <div className="flex flex-col gap-8 p-4 pb-32">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-4">
          <Pill size={48} className="text-yellow-500" /> My Meds
        </h2>
        <AccessibleButton onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'secondary' : 'primary'}>
          {isAdding ? 'Cancel' : <Plus size={40} />}
        </AccessibleButton>
      </div>

      {isAdding && (
        <div className="bg-yellow-100 p-8 rounded-3xl border-8 border-yellow-400 flex flex-col gap-6 animate-slide-up">
          <div className="flex flex-col gap-2">
            <label className="text-2xl font-bold flex items-center gap-2">
              <User size={24} /> Who is taking this?
            </label>
            <input 
              type="text" 
              className="p-4 text-2xl rounded-2xl border-4 border-yellow-300" 
              placeholder="e.g. Grandma Mary"
              value={formData.patientName}
              onChange={e => setFormData({...formData, patientName: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-2xl font-bold">Medicine Name</label>
            <input 
              type="text" 
              className="p-4 text-2xl rounded-2xl border-4 border-yellow-300" 
              placeholder="e.g. Aspirin"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-2xl font-bold">Dosage</label>
            <input 
              type="text" 
              className="p-4 text-2xl rounded-2xl border-4 border-yellow-300" 
              placeholder="e.g. 500mg"
              value={formData.dosage}
              onChange={e => setFormData({...formData, dosage: e.target.value})}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-2xl font-bold">Time</label>
            <input 
              type="time" 
              className="p-4 text-3xl rounded-2xl border-4 border-yellow-300" 
              value={formData.time}
              onChange={e => setFormData({...formData, time: e.target.value})}
            />
          </div>
          <AccessibleButton onClick={addMed} variant="success">Save Medication</AccessibleButton>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {meds.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border-4 border-dashed border-yellow-400 text-slate-400 text-2xl">
            No medications added yet. Press the + button above to start.
          </div>
        ) : (
          meds.sort((a,b) => a.time.localeCompare(b.time)).map(med => (
            <div key={med.id} className="bg-white p-8 rounded-3xl border-4 border-yellow-400 shadow-xl flex justify-between items-center">
              <div className="flex gap-6 items-center">
                <div className="bg-yellow-400 p-4 rounded-2xl shrink-0">
                  <Clock size={40} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="bg-yellow-200 text-yellow-800 text-sm font-black px-3 py-1 rounded-full uppercase tracking-tighter">
                       For: {med.patientName}
                     </span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-800">{med.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xl text-slate-600 font-bold">
                    <span>{med.time}</span>
                    <span className="opacity-30">•</span>
                    <span>{med.dosage}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => removeMed(med.id)} 
                className="p-4 text-red-500 hover:bg-red-50 rounded-2xl transition-colors shrink-0"
              >
                <Trash2 size={40} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="fixed bottom-24 left-4 right-4 bg-yellow-400 text-black p-4 rounded-3xl border-4 border-yellow-600 flex items-center gap-4 shadow-2xl">
        <Info size={32} />
        <p className="text-lg font-bold leading-tight">Always confirm doses with a healthcare professional.</p>
      </div>
    </div>
  );
};

export default MedicinePlanner;

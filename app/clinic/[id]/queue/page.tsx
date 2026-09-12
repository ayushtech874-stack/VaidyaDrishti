'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface QueuePageProps {
  params: Promise<{ id: string }>;
}

export default function PublicClinicQueuePage({ params }: QueuePageProps) {
  const [clinicId, setClinicId] = useState<string>('');
  const [clinic, setClinic] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  useEffect(() => {
    async function init() {
      const resolved = await params;
      setClinicId(resolved.id);
    }
    init();
  }, [params]);

  useEffect(() => {
    if (!clinicId) return;

    async function fetchQueueData() {
      try {
        const res = await fetch(`/api/clinic/${clinicId}/queue`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load queue');

        setClinic(data.clinic);
        setQueue(data.queue || []);
        setLastRefreshed(new Date().toLocaleTimeString());
      } catch (e: any) {
        console.error('Failed to load public queue:', e);
        setError(e.message || 'Error loading live queue roster.');
      } finally {
        setLoading(false);
      }
    }

    fetchQueueData();
    const interval = setInterval(fetchQueueData, 10000); // 10-second live polling for OPD wall displays
    return () => clearInterval(interval);
  }, [clinicId]);

  const nowServing = queue.find((q) => q.status === 'IN CONSULTATION') || queue[0];
  const upcomingQueue = queue.filter((q) => q.id !== nowServing?.id);

  return (
    <div className="min-h-screen bg-[#0F3D3E] text-white flex flex-col font-sans">
      {/* Top Banner Header */}
      <header className="py-6 px-8 bg-[#092627] border-b border-teal-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-700 flex items-center justify-center p-2 shadow-inner">
            <Image src="/icon.svg" alt="VaidyaDrishti" width={32} height={32} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              {clinic?.name || 'OPD Medical Facility Queue'}
            </h1>
            <p className="text-xs font-bold text-teal-300 uppercase tracking-widest mt-0.5">
              Live Waiting Room Board • {clinic?.city || 'OPD Campus'} (PHI-Free Display)
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-2 bg-emerald-900/80 text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-extrabold border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE SYNC ACTIVE</span>
          </div>
          <p className="text-[10px] text-teal-300 mt-1 font-mono">Updated: {lastRefreshed}</p>
        </div>
      </header>

      {/* Main Board Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 space-y-8">
        {loading ? (
          <div className="text-center py-20 text-teal-300 animate-pulse font-bold text-lg">
            Connecting to Live OPD Queue Stream...
          </div>
        ) : error ? (
          <div className="bg-red-950 border border-red-800 text-red-200 p-6 rounded-2xl text-center space-y-2 max-w-md mx-auto my-12">
            <h3 className="font-extrabold text-base">Facility OPD Queue Unavailable</h3>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-[#144A4B] border border-teal-700 rounded-3xl p-12 text-center space-y-3 max-w-xl mx-auto my-12 shadow-xl">
            <span className="text-5xl">🩺</span>
            <h2 className="text-2xl font-extrabold text-white">No Active Patients In OPD Queue</h2>
            <p className="text-xs text-teal-200 leading-relaxed">
              There are currently no patients waiting for consultation at <strong className="text-white">{clinic?.name}</strong>. Intakes submitted online or via OPD desk will appear here automatically.
            </p>
          </div>
        ) : (
          <>
            {/* NOW SERVING HERO CARD */}
            {nowServing && (
              <div className="bg-gradient-to-r from-emerald-950 to-teal-900 border-2 border-emerald-400 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 text-center md:text-left">
                  <span className="text-xs font-extrabold uppercase bg-emerald-500 text-slate-950 px-3.5 py-1 rounded-full tracking-wider">
                    Currently Seeing Practitioner
                  </span>
                  <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                    TOKEN {nowServing.token}
                  </h2>
                  <p className="text-sm font-bold text-emerald-200">
                    OPD Consultation Room #1 • Please enter when called
                  </p>
                </div>

                {upcomingQueue[0] && (
                  <div className="bg-teal-950/90 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-1 min-w-[220px]">
                    <span className="text-[11px] font-extrabold uppercase text-teal-300 tracking-wider">Next In Line</span>
                    <div className="text-3xl font-extrabold text-amber-400 tracking-wider">
                      {upcomingQueue[0].token}
                    </div>
                    <p className="text-[11px] font-bold text-amber-200">Please prepare to enter</p>
                  </div>
                )}
              </div>
            )}

            {/* UPCOMING OPD TOKENS LIST */}
            {upcomingQueue.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold uppercase text-teal-200 tracking-wider">
                  Upcoming Queue Roster (Total Waiting: {upcomingQueue.length})
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {upcomingQueue.map((item, index) => {
                    const isHigh = item.urgency === 'HIGH' || item.urgency === 'IMMEDIATE';
                    const isModerate = item.urgency === 'MODERATE' || item.urgency === 'MEDIUM';
                    return (
                      <div
                        key={item.id || index}
                        className="bg-[#144A4B] border border-teal-700/60 rounded-2xl p-5 shadow-md flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <div className="text-2xl font-black text-white">{item.token}</div>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md inline-block ${
                              isHigh
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : isModerate
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {item.urgency} URGENCY
                          </span>
                        </div>

                        <div className="text-right space-y-1">
                          <span className="text-xs font-bold text-teal-200 block">{item.status}</span>
                          <span className="text-[11px] font-mono text-teal-300 block">
                            ~{item.waitMinutes} mins wait
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PRIVACY FOOTER NOTICE */}
            <div className="bg-[#092627] border border-teal-800/80 rounded-2xl p-4 text-center text-xs text-teal-300 font-medium space-y-1">
              <p>🔒 <strong>DPDP Act 2023 Compliant Public Display</strong>: Patient identities and medical details are excluded to protect health privacy.</p>
              <p className="text-[11px] text-teal-400">If you need assistance, please speak with the OPD front desk coordinator.</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

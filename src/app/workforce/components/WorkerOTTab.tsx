import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { motion } from "motion/react";
import { Clock, Fingerprint, Calendar as CalendarIcon } from "lucide-react";
import { useWorkerHistory } from "@/hooks/useQueries";

export function WorkerOTTab({ history, workerId }: { history?: any[]; workerId?: number | string }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: fetchedHistory = [], isLoading } = useWorkerHistory(workerId as string, selectedMonth);

  // Filter history for days with OT hours
  const otRecords = fetchedHistory.filter((record: any) => record.ot_hours && record.ot_hours > 0);

  const formatOTHours = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} className="space-y-4 pb-24">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black text-gray-900 tracking-tight">Overtime (OT)</h2>
        <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-2 py-1 rounded-lg shadow-sm">
          <CalendarIcon size={14} className="text-zinc-400" />
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-semibold text-zinc-700 outline-none"
          />
        </div>
      </div>
      
      <div className="bg-white rounded-[24px] p-5 shadow-sm border border-zinc-200">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-[14px] font-medium text-gray-500">Loading records...</p>
            </div>
          ) : otRecords.length === 0 ? (
            <div className="text-center py-8">
              <Clock size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-gray-500">No overtime records found</p>
            </div>
          ) : (
            otRecords.map((record: any) => (
              <div key={record.id} className="flex justify-between items-center p-3 border border-zinc-100 rounded-xl bg-zinc-50/50">
                <div>
                  <p className="font-bold text-sm text-zinc-900">{format(parseISO(record.date), "MMM dd, yyyy")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                      <Fingerprint size={12} /> {record.punch_in ? format(parseISO(record.punch_in), "h:mm a") : "--"}
                    </div>
                    <span className="text-zinc-300">•</span>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-medium">
                      <Clock size={12} /> {record.punch_out ? format(parseISO(record.punch_out), "h:mm a") : "--"}
                    </div>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded text-[12px] font-bold uppercase bg-orange-100 text-orange-700">
                  {formatOTHours(record.ot_hours)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

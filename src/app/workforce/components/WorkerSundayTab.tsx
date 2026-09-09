import React, { useState } from "react";
import { format, parseISO, isSunday } from "date-fns";
import { motion } from "motion/react";
import { Sun, Fingerprint, Clock, Calendar as CalendarIcon } from "lucide-react";
import { useWorkerHistory } from "@/hooks/useQueries";

export function WorkerSundayTab({ history, workerId }: { history: any[]; workerId?: number | string }) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: monthHistory, isLoading } = useWorkerHistory(workerId as string, selectedMonth);

  const activeHistory = monthHistory !== undefined 
    ? monthHistory 
    : (history || []).filter((record: any) => record.date && record.date.startsWith(selectedMonth));

  // Filter history for Sundays or Festival Work
  const sundayRecords = activeHistory.filter((record: any) => isSunday(parseISO(record.date)) || record.is_sunday || record.status === 'Sunday Work' || record.status === 'Festival Work' || record.status === 'Holiday Work');

  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} className="space-y-4 pb-24">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Sunday & Festival Work</h2>
        <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-lg shadow-sm">
          <CalendarIcon size={14} className="text-zinc-400" />
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent text-sm font-semibold text-zinc-700 dark:text-zinc-300 outline-none"
          />
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-[24px] p-5 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-zinc-500 dark:text-zinc-400 text-xs py-4">Loading records...</p>
          ) : sundayRecords.length > 0 ? (
            sundayRecords.map((record: any) => (
              <div key={record.id} className="flex justify-between items-center p-3 border border-zinc-100 dark:border-zinc-800/50 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30">
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white">{format(parseISO(record.date), "MMM dd, yyyy")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Fingerprint size={12} /> {record.punch_in ? format(parseISO(record.punch_in), "hh:mm a") : "--"}
                    </div>
                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Clock size={12} /> {record.punch_out ? format(parseISO(record.punch_out), "hh:mm a") : "--"}
                    </div>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase ${
                  record.status === 'Present' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 
                  record.status === 'Absent' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 
                  record.status === 'Festival Work' || record.status === 'Holiday Work' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400' :
                  'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
                }`}>
                  {record.status}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Sun size={32} className="text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-[14px] font-medium text-gray-500 dark:text-zinc-400">No Sunday work records found for this month</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

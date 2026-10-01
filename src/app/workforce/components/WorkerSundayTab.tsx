import React, { useState } from "react";
import { format, parseISO, isSunday, addMonths, subMonths } from "date-fns";
import { motion } from "motion/react";
import { Sun, Fingerprint, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useWorkerHistory } from "@/hooks/useQueries";

export function WorkerSundayTab({ history, workerId }: { history?: any[]; workerId?: number | string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const selectedMonth = format(currentDate, "yyyy-MM");

  const { data: monthHistory, isLoading } = useWorkerHistory(workerId as string, selectedMonth);

  const activeHistory = monthHistory !== undefined 
    ? monthHistory 
    : (history || []).filter((record: any) => record.date && record.date.startsWith(selectedMonth));

  // Filter history for Sundays or Festival Work
  const sundayRecords = activeHistory.filter((record: any) => isSunday(parseISO(record.date)) || record.is_sunday || record.status === 'Sunday Work' || record.status === 'Festival Work' || record.status === 'Holiday Work');

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [year, month] = e.target.value.split("-").map(Number);
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  return (
    <motion.div initial={{opacity:0, y:10}} animate={{opacity:1,y:0}} className="space-y-3 pb-24 transition-colors">
      {/* Header & Month Selector */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Sunday & Festival Work</h2>
        
        {/* Month Selector Controls */}
        <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded-xl shadow-sm relative">
          <button 
            type="button"
            onClick={prevMonth} 
            className="p-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors z-10"
            title="Previous Month"
          >
            <ChevronLeft size={14} />
          </button>
          <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-300 pointer-events-none">
            <CalendarIcon size={12} className="text-zinc-400" />
            <span>{format(currentDate, "MMM, yyyy")}</span>
          </div>
          <button 
            type="button"
            onClick={nextMonth} 
            className="p-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors z-10"
            title="Next Month"
          >
            <ChevronRight size={14} />
          </button>
          <input 
            type="month"
            value={selectedMonth}
            onChange={handleMonthInputChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-0"
            title="Select Month"
          />
        </div>
      </div>
      
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-3 text-white shadow-sm relative overflow-hidden flex justify-between items-center">
        <div className="absolute -right-2 -bottom-2 opacity-15 pointer-events-none">
          <Sun size={60} />
        </div>
        <div>
          <div className="flex items-center gap-1 text-purple-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">
            <Sparkles size={11} /> Total Extra Work Days
          </div>
          <div className="text-lg font-black tracking-tight leading-tight">
            {sundayRecords.length} {sundayRecords.length === 1 ? "Day" : "Days"}
          </div>
        </div>
        <div className="text-right z-10">
          <span className="text-[10px] bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg font-semibold text-purple-100">
            {format(currentDate, "MMMM yyyy")}
          </span>
        </div>
      </div>

      {/* List Container */}
      <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Loading records...</p>
            </div>
          ) : sundayRecords.length > 0 ? (
            sundayRecords.map((record: any) => (
              <div key={record.id || record.date} className="flex justify-between items-center p-2.5 border border-zinc-100 dark:border-zinc-800/50 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30">
                <div>
                  <p className="font-bold text-xs text-zinc-900 dark:text-white">{format(parseISO(record.date), "MMM dd, yyyy")}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Fingerprint size={11} /> {record.punch_in ? format(parseISO(record.punch_in), "hh:mm a") : "--"}
                    </div>
                    <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">•</span>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Clock size={11} /> {record.punch_out ? format(parseISO(record.punch_out), "hh:mm a") : "--"}
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
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
            <div className="text-center py-6">
              <Sun size={28} className="text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">No Sunday or Festival work records found for {format(currentDate, "MMMM yyyy")}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}


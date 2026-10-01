import React, { useState } from "react";
import { format, parseISO, addMonths, subMonths } from "date-fns";
import { motion } from "motion/react";
import { Clock, Fingerprint, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Zap, Award } from "lucide-react";
import { useWorkerHistory } from "@/hooks/useQueries";

export function WorkerOTTab({ history, workerId }: { history?: any[]; workerId?: number | string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const selectedMonth = format(currentDate, "yyyy-MM");
  
  const { data: fetchedHistory, isLoading } = useWorkerHistory(workerId as string, selectedMonth);

  const activeHistory = fetchedHistory !== undefined
    ? fetchedHistory
    : (history || []).filter((record: any) => record.date && record.date.startsWith(selectedMonth));

  // Filter history for days with OT hours
  const otRecords = activeHistory.filter((record: any) => record.ot_hours && record.ot_hours > 0);

  // Total OT calculation for selected month
  const totalOtHoursDecimal = otRecords.reduce((sum: number, record: any) => sum + (Number(record.ot_hours) || 0), 0);
  const totalOtDays = otRecords.length;

  const formatOTHours = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}m`;
  };

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
        <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">Overtime (OT)</h2>
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

      {/* Monthly OT Summary Banner (Compact) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total OT Hours Card */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-3 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -right-1 -bottom-2 opacity-15 pointer-events-none">
            <Clock size={48} />
          </div>
          <div className="flex items-center gap-1 text-orange-100 text-[10px] font-bold uppercase tracking-wider mb-0.5">
            <Zap size={11} /> Total OT Hours
          </div>
          <div className="text-lg font-black tracking-tight leading-tight">
            {totalOtHoursDecimal > 0 ? formatOTHours(totalOtHoursDecimal) : "0h 0m"}
          </div>
          <p className="text-[10px] text-orange-100/80 mt-0.5 font-medium truncate">
            {format(currentDate, "MMMM yyyy")}
          </p>
        </div>

        {/* Total OT Days Count Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
            <Award size={11} className="text-orange-500" /> Total OT Days
          </div>
          <div className="text-lg font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            {totalOtDays} {totalOtDays === 1 ? "Day" : "Days"}
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium truncate">
            Overtime sessions
          </p>
        </div>
      </div>
      
      {/* Daily Breakdown List */}
      <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Daily Breakdown</h3>
          <span className="text-[11px] font-semibold text-zinc-400">{otRecords.length} {otRecords.length === 1 ? 'record' : 'records'}</span>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">Loading records...</p>
            </div>
          ) : otRecords.length === 0 ? (
            <div className="text-center py-6">
              <Clock size={28} className="text-gray-300 dark:text-zinc-700 mx-auto mb-2" />
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">No overtime records found for {format(currentDate, "MMMM yyyy")}</p>
            </div>
          ) : (
            otRecords.map((record: any) => (
              <div key={record.id || record.date} className="flex justify-between items-center p-2.5 border border-zinc-100 dark:border-zinc-800/50 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/30">
                <div>
                  <p className="font-bold text-xs text-zinc-900 dark:text-white">{format(parseISO(record.date), "MMM dd, yyyy")}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Fingerprint size={11} /> {record.punch_in ? format(parseISO(record.punch_in), "h:mm a") : "--"}
                    </div>
                    <span className="text-zinc-300 dark:text-zinc-600 text-[10px]">•</span>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                      <Clock size={11} /> {record.punch_out ? format(parseISO(record.punch_out), "h:mm a") : "--"}
                    </div>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/50">
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


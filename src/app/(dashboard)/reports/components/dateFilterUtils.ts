export const isDateInFilterRange = (dateRaw?: string | Date | number | null, dateRange: string = "All Time"): boolean => {
  if (!dateRange || dateRange === "All Time") return true;
  if (!dateRaw) return false;

  let compDate: Date | null = null;
  if (dateRaw instanceof Date) {
    compDate = dateRaw;
  } else if (typeof dateRaw === "number") {
    compDate = new Date(dateRaw);
  } else {
    let str = String(dateRaw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      compDate = new Date(y, m - 1, d);
    } else {
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
        str += "Z";
      }
      compDate = new Date(str);
    }
  }

  if (!compDate || isNaN(compDate.getTime())) return true;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (dateRange === "Today") {
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    return compDate >= todayStart && compDate < todayEnd;
  } else if (dateRange === "Yesterday") {
    const yestStart = new Date(todayStart);
    yestStart.setDate(yestStart.getDate() - 1);
    return compDate >= yestStart && compDate < todayStart;
  } else if (dateRange === "This Week") {
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return compDate >= weekStart;
  } else if (dateRange === "Last 7 Days") {
    const d7 = new Date(todayStart);
    d7.setDate(d7.getDate() - 7);
    return compDate >= d7;
  } else if (dateRange === "Last 30 Days") {
    const d30 = new Date(todayStart);
    d30.setDate(d30.getDate() - 30);
    return compDate >= d30;
  } else if (dateRange === "This Month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return compDate >= monthStart;
  }

  return true;
};

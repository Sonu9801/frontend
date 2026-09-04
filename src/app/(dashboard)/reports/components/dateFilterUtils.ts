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
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return compDate >= monthStart && compDate < monthEnd;
  } else if (dateRange === "Last Month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    return compDate >= monthStart && compDate < monthEnd;
  } else if (dateRange.startsWith("Month: ")) {
    const monthVal = dateRange.replace("Month: ", "").trim();
    const [y, m] = monthVal.split("-").map(Number);
    if (y && m) {
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 1);
      return compDate >= monthStart && compDate < monthEnd;
    }
  } else if (dateRange.startsWith("Custom: ")) {
    const rangePart = dateRange.replace("Custom: ", "").trim();
    const [sStr, eStr] = rangePart.split(" to ");
    if (sStr) {
      const [sy, sm, sd] = sStr.split("-").map(Number);
      const startDate = new Date(sy, sm - 1, sd || 1, 0, 0, 0);
      if (eStr) {
        const [ey, em, ed] = eStr.split("-").map(Number);
        const endDate = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        return compDate >= startDate && compDate <= endDate;
      }
      return compDate >= startDate;
    }
  }

  return true;
};

export const formatFilterLabel = (dateRange: string): string => {
  if (!dateRange) return "All Time";
  if (dateRange.startsWith("Month: ")) {
    const monthVal = dateRange.replace("Month: ", "").trim();
    const [y, m] = monthVal.split("-").map(Number);
    if (y && m) {
      const date = new Date(y, m - 1, 1);
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  }
  if (dateRange.startsWith("Custom: ")) {
    return dateRange.replace("Custom: ", "Custom Range: ");
  }
  return dateRange;
};


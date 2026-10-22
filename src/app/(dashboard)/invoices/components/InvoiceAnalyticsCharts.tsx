import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
];

export const formatCurrencyAxis = (val: number) => {
  if (!val || val === 0) return "₹0";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) {
    const l = val / 100000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)}L`;
  }
  if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
  return `₹${val}`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const val = Number(entry?.value) || 0;
    const name = entry?.payload?.name || label || "Amount";

    return (
      <div className="bg-popover/95 backdrop-blur-md text-popover-foreground border border-border p-3 rounded-xl shadow-xl min-w-[160px] text-xs">
        <p className="font-bold text-foreground mb-1.5 truncate max-w-[200px]">{name}</p>
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
          <span className="text-muted-foreground font-medium">Billed Value:</span>
          <span className="font-mono font-bold text-foreground">
            ₹{val.toLocaleString("en-IN")}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function InvoiceAnalyticsCharts({ data }: { data: any }) {
  if (!data) return null;

  const entities = data.topVendors || data.topCustomers || [];
  const entityLabel = data.topVendors ? "Top Vendors (Procurement Share)" : "Top Customers (Revenue Share)";
  const pieData = data.departmentDistribution || data.oemDistribution || [];
  const pieLabel = data.departmentDistribution ? "Department Expense Share" : "OEM Revenue Distribution";
  const barData = data.categoryDistribution || [];

  const totalEntityValue = useMemo(() => {
    return entities.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0);
  }, [entities]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
      {/* 1. Monthly Trend Area Chart */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col h-80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <span>📈</span> Monthly Billing Trend
          </h3>
          <span className="text-[11px] font-mono text-muted-foreground">GST Invoiced Volume</span>
        </div>
        <div className="flex-1 w-full h-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrencyAxis}
                width={55}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorTotal)"
                dot={{ r: 3, fill: "#3b82f6" }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Top Entities Horizontal Bar Chart with Ellipsis & Clean Width */}
      <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col h-80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
            <span>🏢</span> {entityLabel}
          </h3>
          <span className="text-[11px] font-mono font-bold text-primary">
            {formatCurrencyAxis(totalEntityValue)} Total
          </span>
        </div>
        <div className="flex-1 w-full h-full min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={entities}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.6} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatCurrencyAxis}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                width={150}
                tickLine={false}
                axisLine={false}
                tickFormatter={(name: string) => {
                  if (!name) return "";
                  return name.length > 20 ? `${name.slice(0, 18)}...` : name;
                }}
              />
              <RechartsTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                content={<CustomTooltip />}
              />
              <Bar
                dataKey="value"
                fill="#3b82f6"
                radius={[0, 6, 6, 0]}
                barSize={18}
                isAnimationActive={false}
              >
                {entities.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Distribution Pie Chart */}
      {pieData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col h-80">
          <h3 className="text-xs sm:text-sm font-bold mb-3 text-foreground flex items-center gap-2">
            <span>📊</span> {pieLabel}
          </h3>
          <div className="flex-1 w-full h-full relative min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  isAnimationActive={false}
                >
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: "11px", fontWeight: 500 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Category Distribution Bar Chart */}
      {barData.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-2xs flex flex-col h-80">
          <h3 className="text-xs sm:text-sm font-bold mb-3 text-foreground flex items-center gap-2">
            <span>🏷️</span> Category Distribution
          </h3>
          <div className="flex-1 w-full h-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatCurrencyAxis}
                  width={55}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  fill="#8b5cf6"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

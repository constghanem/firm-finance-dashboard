import { Link, Route, Switch, useLocation } from "wouter";
import { LayoutDashboard, Coins, Boxes, Users, Building2, Receipt, FileSpreadsheet, Wallet, SlidersHorizontal, Database } from "lucide-react";
import type { ComponentType } from "react";
import Dashboard from "@/pages/Dashboard";
import Sales from "@/pages/Sales";
import Services from "@/pages/Services";
import Team from "@/pages/Team";
import Rentals from "@/pages/Rentals";
import Expenses from "@/pages/Expenses";
import PnL from "@/pages/PnL";
import CashForecast from "@/pages/CashForecast";
import Scenarios from "@/pages/Scenarios";
import DataCenter from "@/pages/DataCenter";
import { ScopeSelect } from "@/components/ui";

const NAV: { path: string; label: string; icon: ComponentType<{ size?: number }>; page: ComponentType }[] = [
  { path: "/", label: "لوحة المؤشرات", icon: LayoutDashboard, page: Dashboard },
  { path: "/sales", label: "المبيعات", icon: Coins, page: Sales },
  { path: "/services", label: "الخدمات وتسعيرها", icon: Boxes, page: Services },
  { path: "/team", label: "الموظفون والرواتب", icon: Users, page: Team },
  { path: "/rentals", label: "التأجير", icon: Building2, page: Rentals },
  { path: "/expenses", label: "المصروفات", icon: Receipt, page: Expenses },
  { path: "/pnl", label: "قائمة الدخل", icon: FileSpreadsheet, page: PnL },
  { path: "/cash", label: "التدفق النقدي والتوقع", icon: Wallet, page: CashForecast },
  { path: "/scenarios", label: "السيناريوهات", icon: SlidersHorizontal, page: Scenarios },
  { path: "/data", label: "البيانات والتصدير", icon: Database, page: DataCenter },
];

function NotFound() {
  return <p className="text-slate-500">الصفحة غير موجودة.</p>;
}

export default function App() {
  const [location] = useLocation();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 bg-slate-900 p-4 text-slate-200 md:w-60 print:hidden">
        <div className="mb-6">
          <div className="text-lg font-bold text-white">لوحة المالية</div>
          <div className="text-xs text-slate-400">مجموعة المكاتب: محاماة وخدمات أعمال</div>
        </div>
        <nav className="flex flex-wrap gap-1 md:flex-col">
          {NAV.map((n) => {
            const active = n.path === "/" ? location === "/" : location.startsWith(n.path);
            const Icon = n.icon;
            return (
              <Link
                key={n.path}
                href={n.path}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                  active ? "bg-sky-700 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <Icon size={16} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 hidden text-xs leading-5 text-slate-500 md:block">
          البيانات مُنقّحة (الأسماء والأرقام الحساسة مُزالة). الأرقام تقديرية حتى تُراجَع.
        </div>
      </aside>
      <main className="min-w-0 flex-1 bg-slate-50 p-4 md:p-6 print:bg-white print:p-0">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 print:hidden">
          <ScopeSelect />
        </div>
        <Switch>
          {NAV.map((n) => (
            <Route key={n.path} path={n.path} component={n.page} />
          ))}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

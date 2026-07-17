import {
  CalendarDays,
  CalendarRange,
  Percent,
  Users,
} from "lucide-react";

const format = (n = 0) =>
  new Intl.NumberFormat("en-IN").format(n);

export default function StatsCards({ summary }) {
  const stats = [
    {
      title: "Today's Leads",
      value: summary?.todayLeads || 0,
      icon: CalendarDays,
      iconBg: "bg-blue-50/70",
      iconColor: "text-blue-600",
      hoverBorder: "group-hover:border-blue-200",
    },
    {
      title: "Monthly Leads",
      value: summary?.monthLeads || 0,
      icon: CalendarRange,
      iconBg: "bg-green-50/70",
      iconColor: "text-green-600",
      hoverBorder: "group-hover:border-green-200",
    },
    {
      title: "Conversion Rate",
      value: `${summary?.conversionRate || 0}%`,
      icon: Percent,
      iconBg: "bg-orange-50/70",
      iconColor: "text-orange-600",
      hoverBorder: "group-hover:border-orange-200",
    },
    {
      title: "Active Counsellors",
      value: summary?.activeCounsellors || 0,
      icon: Users,
      iconBg: "bg-purple-50/70",
      iconColor: "text-purple-600",
      hoverBorder: "group-hover:border-purple-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {stats.map((item, index) => {
        const Icon = item.icon;

        return (
          <div
            key={index}
            className={`
              group bg-white rounded-[6px] p-6 
              border border-gray-100 shadow-sm
              transition-all duration-300 ease-in-out
              hover:shadow-md hover:-translate-y-1
              ${item.hoverBorder}
            `}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 tracking-wide">
                  {item.title}
                </p>

                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {typeof item.value === "number"
                    ? format(item.value)
                    : item.value}
                </h2>
              </div>

              <div
                className={`
                  w-12 h-12 rounded-md flex justify-center items-center 
                  ${item.iconBg} transition-transform duration-300 
                  group-hover:scale-110
                `}
              >
                <Icon className={item.iconColor} size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
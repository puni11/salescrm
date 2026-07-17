import {
  Users,
  Phone,
  MessageCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";

const formatNumber = (num = 0) =>
  new Intl.NumberFormat("en-IN").format(num);

export default function SummaryCards({ summary }) {
  const cards = [
    {
      title: "Total Leads",
      value: summary.totalLeads,
      growth: `${summary.todayLeads} Today`,
      trend: "up", // 'up', 'down', or 'neutral'
      icon: Users,
      bg: "bg-white",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      title: "Engagement Score",
      value: summary.totalEngagementScore,
      growth: `${summary.averageLeadScore} Avg Score`,
      trend: "neutral",
      icon: TrendingUp,
      bg: "bg-gradient-to-br from-[#3a5c7b] to-[#05335c] text-white",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      highlight: true,
    },
    {
      title: "Total Calls",
      value: summary.totalCalls,
      growth: `${summary.todayCalls} Today`,
      trend: "up",
      icon: Phone,
      bg: "bg-white",
      iconBg: "bg-gray-50",
      iconColor: "text-gray-700",
    },
    {
      title: "WhatsApp Sent",
      value: summary.totalWhatsapp,
      growth: `${summary.activeCounsellors} Active Staff`,
      trend: "neutral",
      icon: MessageCircle,
      bg: "bg-white",
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
  ];

  const getTrendIcon = (trend, highlight) => {
    if (trend === 'up') return <ArrowUpRight size={16} className={highlight ? "text-orange-100" : "text-emerald-500"} />;
    if (trend === 'down') return <ArrowDownRight size={16} className={highlight ? "text-orange-100" : "text-red-500"} />;
    return <Minus size={16} className={highlight ? "text-orange-100" : "text-gray-400"} />;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;

        return (
          <div
            key={index}
            className={`
              ${card.bg} 
              rounded-[8px] p-6 
              shadow-sm border border-gray-100/80
              transition-all duration-300 ease-in-out
              hover:shadow-md hover:-translate-y-1
              flex flex-col justify-between
              min-h-[120px]
            `}
          >
            {/* Top Row: Title & Icon */}
            <div className="flex justify-between items-start">
              <p
                className={`text-sm font-medium tracking-wide ${
                  card.highlight ? "text-gray-50" : "text-gray-500"
                }`}
              >
                {card.title}
              </p>
              <div
                className={`${card.iconBg} w-10 h-10 rounded-full flex items-center justify-center`}
              >
                <Icon className={card.iconColor} size={20} strokeWidth={2.5} />
              </div>
            </div>

            {/* Bottom Row: Value & Growth */}
            <div className="mt-4">
              <h2
                className={`text-3xl font-bold tracking-tight ${
                  card.highlight ? "text-white" : "text-gray-900"
                }`}
              >
                {formatNumber(card.value)}
              </h2>

              <div className="flex items-center gap-1.5 mt-2">
                <span className="flex items-center justify-center">
                  {getTrendIcon(card.trend, card.highlight)}
                </span>
                <span
                  className={`text-sm font-medium ${
                    card.highlight ? "text-gray-50" : "text-gray-500"
                  }`}
                >
                  {card.growth}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
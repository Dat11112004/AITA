import {
  BarChart3,
  BookOpen,
  Brain,
  CheckSquare,
  ClipboardList,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PieChart,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  Brain,
  BarChart3,
  Settings,
  BookOpen,
  FileText,
  Sparkles,
  CheckSquare,
  ShieldCheck,
  PieChart,
  ClipboardList,
  Upload,
  MessageSquare,
  Route,
  TrendingUp,
  Zap,
  Clock,
  Code2,
  Target,
}

interface IconProps {
  name: string
  className?: string
  size?: number
}

export function Icon({ name, className, size = 20 }: IconProps) {
  const LucideIcon = ICONS[name]
  if (!LucideIcon) return null
  return <LucideIcon className={className} size={size} />
}

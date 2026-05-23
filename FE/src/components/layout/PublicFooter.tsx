import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { PORTAL_LINKS } from '@/constants/navigation'

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-bold text-white">
              <GraduationCap className="text-accent-500" />
              AITA
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              AI-powered Teaching Assistant System — Hỗ trợ giảng viên FPT trong giảng dạy
              Software Engineering.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Cổng hệ thống</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {PORTAL_LINKS.map((p) => (
                <li key={p.path}>
                  <Link to={p.path} className="hover:text-white">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Liên hệ</h4>
            <p className="mt-3 text-sm text-slate-400">
              FPT University — Dự án đồ án / Capstone
              <br />
              Phiên bản giao diện: 0.1.0
            </p>
          </div>
        </div>
        <p className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} AITA. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

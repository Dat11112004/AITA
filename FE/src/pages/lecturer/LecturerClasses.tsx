import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type ClassRow, type SemesterRow, type SubjectRow } from '@/lib/api'
import {
  Loader2, Search, Filter, Sun, CloudRain, Wind, Leaf,
  Calendar, ChevronDown, ChevronUp, Book, Code, MoreHorizontal,
  Users, Info
} from 'lucide-react'

export function LecturerClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [semesters, setSemesters] = useState<SemesterRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Expanded state
  const [expandedSeasons, setExpandedSeasons] = useState<Record<string, boolean>>({})
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({})
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({}) // For showing classes

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clsData, semData, subData] = await Promise.all([
        api.getClasses(),
        api.getSemesters(),
        api.getSubjects(1, 1000)
      ])
      setClasses(clsData || [])
      setSemesters(semData || [])
      setSubjects(subData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Grouping Logic
  type SubjectGroup = { subjectId: string; subjectCode: string; subjectName: string; classes: ClassRow[]; avgStudents: number }
  type SemesterGroup = { semesterId: string; semesterCode: string; startDate?: string; endDate?: string; isActive: boolean; subjects: Record<string, SubjectGroup> }
  type SeasonGroup = { seasonName: string; isActive: boolean; semesters: Record<string, SemesterGroup> }

  const groupedData: Record<string, SeasonGroup> = {};

  const filteredClasses = classes.filter(c => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.subject as any)?.code?.toLowerCase().includes(q)
    }
    return true
  })

  filteredClasses.forEach(cls => {
    const semId = (cls.semester as any)?.id || 'unknown';
    const semesterRecord = semesters.find(s => s.id === semId);

    const seasonName = semesterRecord?.season || 'Các Học Kỳ Khác';
    const semesterCode = semesterRecord?.code || (cls.semester as any)?.code || 'Kỳ Khác';

    const subId = (cls.subject as any)?.id || 'unknown';
    const subjectRecord = subjects.find(s => s.id === subId);
    const subjectCode = subjectRecord?.code || (cls.subject as any)?.code || 'Môn Khác';
    const subjectName = subjectRecord?.name || (cls.subject as any)?.name || 'Chưa rõ tên môn';

    if (!groupedData[seasonName]) {
      groupedData[seasonName] = { seasonName, isActive: false, semesters: {} };
    }
    const seasonGroup = groupedData[seasonName];
    if (semesterRecord?.isActive) seasonGroup.isActive = true;

    if (!seasonGroup.semesters[semId]) {
      seasonGroup.semesters[semId] = {
        semesterId: semId,
        semesterCode,
        startDate: semesterRecord?.startDate,
        endDate: semesterRecord?.endDate,
        isActive: semesterRecord?.isActive || false,
        subjects: {}
      };
    }
    const semesterGroup = seasonGroup.semesters[semId];

    if (!semesterGroup.subjects[subId]) {
      semesterGroup.subjects[subId] = { subjectId: subId, subjectCode, subjectName, classes: [], avgStudents: 0 };
    }

    semesterGroup.subjects[subId].classes.push(cls);
  });

  // Calculate averages & sort
  const sortedSeasons = Object.values(groupedData).sort((a, b) => {
    if (a.seasonName === 'Các Học Kỳ Khác') return 1;
    if (b.seasonName === 'Các Học Kỳ Khác') return -1;
    return b.seasonName.localeCompare(a.seasonName);
  });

  sortedSeasons.forEach(season => {
    Object.values(season.semesters).forEach(semester => {
      Object.values(semester.subjects).forEach(subject => {
        const totalStudents = subject.classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
        subject.avgStudents = subject.classes.length > 0 ? Math.round(totalStudents / subject.classes.length) : 0;
      });
    });
  });

  // Auto-expand first season and its first semester on load
  useEffect(() => {
    if (sortedSeasons.length > 0 && Object.keys(expandedSeasons).length === 0) {
      const firstSeason = sortedSeasons[0];
      setExpandedSeasons({ [firstSeason.seasonName]: true });

      const semestersList = Object.values(firstSeason.semesters);
      if (semestersList.length > 0) {
        setExpandedSemesters({ [semestersList[0].semesterId]: true });
      }
    }
  }, [sortedSeasons.length])

  const toggleSeason = (name: string) => setExpandedSeasons(prev => ({ ...prev, [name]: !prev[name] }))
  const toggleSemester = (id: string) => setExpandedSemesters(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const getSeasonIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('hè') || lower.includes('summer')) return <Sun className="w-6 h-6 text-indigo-500" />
    if (lower.includes('xuân') || lower.includes('spring')) return <Leaf className="w-6 h-6 text-pink-500" />
    if (lower.includes('thu') || lower.includes('fall')) return <Wind className="w-6 h-6 text-orange-500" />
    if (lower.includes('đông') || lower.includes('winter')) return <CloudRain className="w-6 h-6 text-blue-500" />
    return <Sun className="w-6 h-6 text-indigo-500" />
  }

  const getSeasonBg = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('hè') || lower.includes('summer')) return 'bg-indigo-50'
    if (lower.includes('xuân') || lower.includes('spring')) return 'bg-pink-50'
    if (lower.includes('thu') || lower.includes('fall')) return 'bg-orange-50'
    return 'bg-indigo-50'
  }

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 px-6 lg:px-8">

      {/* Header matching the design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-slate-400" />
            Tất cả lớp học
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản lý hệ thống lớp học theo cấu trúc: Mùa học → Kỳ học → Môn học → Lớp học.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 font-sans">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-500 font-sans">K</kbd>
            </div>
          </div>
          <button className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-bold text-slate-800 mb-4">Danh sách theo cấu trúc đào tạo</h3>

        <div className="space-y-4">
          {sortedSeasons.map(season => {
            const isExpanded = expandedSeasons[season.seasonName];
            const semesterCount = Object.keys(season.semesters).length;
            const sortedSemesters = Object.values(season.semesters).sort((a, b) => a.semesterCode.localeCompare(b.semesterCode));

            return (
              <div key={season.seasonName} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">

                {/* Season Header */}
                <div
                  onClick={() => toggleSeason(season.seasonName)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getSeasonBg(season.seasonName)}`}>
                      {getSeasonIcon(season.seasonName)}
                    </div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-bold text-slate-800">{season.seasonName}</h2>
                      {season.isActive && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                          Đang diễn ra
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-slate-500">
                    <span className="text-sm font-medium text-indigo-600">{semesterCount} kỳ học</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Season Content */}
                {isExpanded && (
                  <div className="p-4 pt-0 border-t border-slate-100 space-y-4">
                    {sortedSemesters.map(semester => {
                      const isSemExpanded = expandedSemesters[semester.semesterId];
                      const subjectCount = Object.keys(semester.subjects).length;
                      const sortedSubjects = Object.values(semester.subjects).sort((a, b) => a.subjectName.localeCompare(b.subjectName));

                      return (
                        <div key={semester.semesterId} className="border border-slate-200 rounded-lg overflow-hidden mt-4">

                          {/* Semester Header */}
                          <div
                            onClick={() => toggleSemester(semester.semesterId)}
                            className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-blue-500 shadow-sm">
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-slate-800">{semester.semesterCode}</h3>
                                {(semester.startDate || semester.endDate) && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {formatDate(semester.startDate)} - {formatDate(semester.endDate)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500">
                              <span className="text-sm font-medium text-indigo-600">{subjectCount} môn học</span>
                              {isSemExpanded ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                          </div>

                          {/* Semester Content (Subject Table) */}
                          {isSemExpanded && (
                            <div className="bg-white overflow-x-auto">
                              <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 bg-white border-b border-slate-100">
                                  <tr>
                                    <th className="px-6 py-4 font-medium">Môn học</th>
                                    <th className="px-6 py-4 font-medium text-center">Mã môn</th>
                                    <th className="px-6 py-4 font-medium text-center">Số lớp</th>
                                    <th className="px-6 py-4 font-medium text-center">Sĩ số trung bình</th>
                                    <th className="px-6 py-4 font-medium text-center">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sortedSubjects.map(subject => {
                                    const isSubjExpanded = expandedSubjects[subject.subjectId];

                                    return (
                                      <React.Fragment key={subject.subjectId}>
                                        <tr
                                          onClick={() => navigate(`/lecturer/subjects/${subject.subjectId}/workspace?semesterId=${semester.semesterId}`)}
                                          className="hover:bg-slate-50/50 group cursor-pointer"
                                        >
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                {subject.subjectCode.includes('PR') ? <Code className="w-4 h-4" /> : <Book className="w-4 h-4" />}
                                              </div>
                                              <span className="font-semibold text-slate-700">{subject.subjectName}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-center text-slate-600">{subject.subjectCode}</td>
                                          <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold">
                                              {subject.classes.length} lớp
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 text-center text-slate-600">{subject.avgStudents} sinh viên</td>
                                          <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                              <button
                                                onClick={(e) => toggleSubject(subject.subjectId, e)}
                                                className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors"
                                                title="Xem danh sách lớp"
                                              >
                                                {isSubjExpanded ? <ChevronDown className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                              </button>
                                              <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                              >
                                                <MoreHorizontal className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Expanded Subject Classes */}
                                        {isSubjExpanded && subject.classes.length > 1 && (
                                          <tr className="bg-slate-50/50">
                                            <td colSpan={5} className="p-0 border-b border-indigo-100">
                                              <div className="px-8 py-4 flex flex-wrap gap-2.5">
                                                {subject.classes.map(cls => (
                                                  <button
                                                    key={cls.id}
                                                    onClick={() => navigate(`/lecturer/classes/${cls.id}`)}
                                                    className="group/btn flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 hover:shadow hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                  >
                                                    <span className="w-2 h-2 rounded-full bg-indigo-400 group-hover/btn:bg-indigo-500 transition-colors"></span>
                                                    <span className="font-semibold text-slate-700 group-hover/btn:text-indigo-700 transition-colors">
                                                      Lớp {cls.code}
                                                    </span>
                                                  </button>
                                                ))}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 flex items-center justify-between p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Info className="w-4 h-4" />
          <span><span className="font-semibold">Mẹo:</span> Nhấn vào kỳ học hoặc biểu tượng nhóm người để xem chi tiết các lớp học bên trong.</span>
        </div>
        <a href="#" className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">
          Hướng dẫn sử dụng <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>

    </div>
  )
}
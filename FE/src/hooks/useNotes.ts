import { useState, useEffect, useCallback } from 'react'

export interface Note {
  id: string;
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  content: string;
  status: 'pending' | 'completed';
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])

  // Load from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('aita_calendar_notes')
      if (stored) {
        setNotes(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to parse notes from local storage:', error)
    }
  }, [])

  // Save to local storage whenever notes change
  const saveNotes = useCallback((newNotes: Note[]) => {
    setNotes(newNotes)
    localStorage.setItem('aita_calendar_notes', JSON.stringify(newNotes))
  }, [])

  const addNote = useCallback((dateStr: string, timeStr: string, content: string) => {
    const newNote: Note = {
      id: Math.random().toString(36).substring(2, 9),
      dateStr,
      timeStr,
      content,
      status: 'pending'
    }
    saveNotes([...notes, newNote])
  }, [notes, saveNotes])

  const deleteNote = useCallback((id: string) => {
    saveNotes(notes.filter(n => n.id !== id))
  }, [notes, saveNotes])

  const toggleNoteStatus = useCallback((id: string) => {
    saveNotes(notes.map(n => 
      n.id === id ? { ...n, status: n.status === 'pending' ? 'completed' : 'pending' } : n
    ))
  }, [notes, saveNotes])

  // Get notes for a specific date (YYYY-MM-DD)
  const getNotesForDate = useCallback((dateStr: string) => {
    return notes.filter(n => n.dateStr === dateStr).sort((a, b) => a.timeStr.localeCompare(b.timeStr))
  }, [notes])

  // Get overdue/pending notes
  // Current datetime comparison
  const getCurrentStatus = useCallback((now: Date) => {
    let hasPending = false;
    let hasOverdue = false;
    
    // Create a comparable string for current time YYYY-MM-DD HH:mm
    const nowIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString();
    const currentComparable = nowIso.replace('T', ' ').substring(0, 16);

    notes.forEach(note => {
      if (note.status === 'pending') {
        const noteComparable = `${note.dateStr} ${note.timeStr}`;
        if (currentComparable > noteComparable) {
          hasOverdue = true;
        } else {
          hasPending = true;
        }
      }
    });

    return { hasPending, hasOverdue };
  }, [notes])

  return {
    notes,
    addNote,
    deleteNote,
    toggleNoteStatus,
    getNotesForDate,
    getCurrentStatus
  }
}

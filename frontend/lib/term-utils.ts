/**
 * Zimbabwe School Term Utilities
 * 
 * Zimbabwe schools typically have 3 terms:
 * - Term 1: Mid-January to Early April
 * - Term 2: Mid-May to Early August
 * - Term 3: Early September to Early December
 */

export interface TermInfo {
  term: number
  termName: string
  year: number
  startDate: Date
  endDate: Date
  isCurrentTerm: boolean
}

/**
 * Get the approximate term dates for a given year
 * These are typical dates and may vary slightly each year
 */
export function getTermDates(year: number): TermInfo[] {
  return [
    {
      term: 1,
      termName: 'Term 1',
      year,
      startDate: new Date(year, 0, 14), // January 14
      endDate: new Date(year, 3, 10),   // April 10
      isCurrentTerm: false
    },
    {
      term: 2,
      termName: 'Term 2',
      year,
      startDate: new Date(year, 4, 13), // May 13
      endDate: new Date(year, 7, 7),    // August 7
      isCurrentTerm: false
    },
    {
      term: 3,
      termName: 'Term 3',
      year,
      startDate: new Date(year, 8, 9),  // September 9
      endDate: new Date(year, 11, 1),   // December 1
      isCurrentTerm: false
    }
  ]
}

/**
 * Determine the current term based on today's date
 */
export function getCurrentTerm(): TermInfo {
  const today = new Date()
  const currentYear = today.getFullYear()
  const terms = getTermDates(currentYear)
  
  // Check which term we're currently in
  for (const term of terms) {
    if (today >= term.startDate && today <= term.endDate) {
      return { ...term, isCurrentTerm: true }
    }
  }
  
  // If we're between terms (holidays), determine next term
  // Between Term 1 and Term 2 (April-May holiday)
  if (today > terms[0].endDate && today < terms[1].startDate) {
    return { ...terms[1], isCurrentTerm: false } // Next term is Term 2
  }
  
  // Between Term 2 and Term 3 (August-September holiday)
  if (today > terms[1].endDate && today < terms[2].startDate) {
    return { ...terms[2], isCurrentTerm: false } // Next term is Term 3
  }
  
  // After Term 3 (December holiday) - next year's Term 1
  if (today > terms[2].endDate) {
    const nextYearTerms = getTermDates(currentYear + 1)
    return { ...nextYearTerms[0], isCurrentTerm: false }
  }
  
  // Before Term 1 starts (early January) - Term 1 of current year
  if (today < terms[0].startDate) {
    return { ...terms[0], isCurrentTerm: false }
  }
  
  // Fallback to Term 1
  return { ...terms[0], isCurrentTerm: true }
}

/**
 * Get a formatted term label (e.g., "Term 1 2025")
 */
export function getTermLabel(termInfo?: TermInfo): string {
  const term = termInfo || getCurrentTerm()
  return `${term.termName} ${term.year}`
}

/**
 * Get the exam title for a class and subject
 */
export function getExamTitle(className: string, subjectName: string, termInfo?: TermInfo): string {
  const term = termInfo || getCurrentTerm()
  return `${className} ${subjectName} End of ${term.termName} Exam`
}

/**
 * Check if we're currently in exam period (last 3 weeks of term)
 */
export function isExamPeriod(termInfo?: TermInfo): boolean {
  const term = termInfo || getCurrentTerm()
  const today = new Date()
  
  // Calculate 3 weeks before end of term
  const examStart = new Date(term.endDate)
  examStart.setDate(examStart.getDate() - 21)
  
  return today >= examStart && today <= term.endDate
}

/**
 * Get the default exam date (usually 1 week before end of term)
 */
export function getDefaultExamDate(termInfo?: TermInfo): string {
  const term = termInfo || getCurrentTerm()
  const examDate = new Date(term.endDate)
  examDate.setDate(examDate.getDate() - 7)
  return examDate.toISOString().split('T')[0]
}

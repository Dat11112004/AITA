/**
 * Unit Tests for Season Detector Utility
 * Tests season extraction from various filename formats
 */

import { describe, test, expect } from '@jest/globals'
import { detectSeasonFromFilename, SeasonDetectorError } from './season-detector.util.js'

describe('SeasonDetectorUtil', () => {
    describe('Valid season detection', () => {
        test('should detect Fall_2026 format', () => {
            const result = detectSeasonFromFilename('Fall_2026_students.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
            expect(result.formatted).toBe('Fall 2026')
        })

        test('should detect Spring_2025 format', () => {
            const result = detectSeasonFromFilename('Spring_2025.xlsx')
            expect(result.season).toBe('Spring')
            expect(result.year).toBe(2025)
        })

        test('should detect Summer_2026 format', () => {
            const result = detectSeasonFromFilename('Summer_2026_import.xlsx')
            expect(result.season).toBe('Summer')
            expect(result.year).toBe(2026)
        })

        test('should detect Winter_2024 format', () => {
            const result = detectSeasonFromFilename('Winter_2024.csv')
            expect(result.season).toBe('Winter')
            expect(result.year).toBe(2024)
        })

        test('should be case-insensitive (uppercase)', () => {
            const result = detectSeasonFromFilename('FALL_2026_STUDENTS.XLSX')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })

        test('should be case-insensitive (lowercase)', () => {
            const result = detectSeasonFromFilename('spring_2025_data.xlsx')
            expect(result.season).toBe('Spring')
            expect(result.year).toBe(2025)
        })

        test('should handle mixed case', () => {
            const result = detectSeasonFromFilename('SuMmEr_2026.xlsx')
            expect(result.season).toBe('Summer')
            expect(result.year).toBe(2026)
        })

        test('should work with hyphens instead of underscores', () => {
            const result = detectSeasonFromFilename('Fall-2026-students.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })

        test('should work with spaces', () => {
            const result = detectSeasonFromFilename('Fall 2026 students.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })
    })

    describe('Invalid season detection', () => {
        test('should throw error for missing season', () => {
            expect(() => {
                detectSeasonFromFilename('students_2026.xlsx')
            }).toThrow(SeasonDetectorError)
        })

        test('should accept "autumn" as a documented alias of Fall', () => {
            // SEASON_ALIASES maps autumn → Fall, so this is a supported name, not an invalid one.
            const result = detectSeasonFromFilename('Autumn_2026.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })

        test('should fallback to current year for missing year', () => {
            const result = detectSeasonFromFilename('Fall_students.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(new Date().getFullYear())
        })

        // As-built (defect candidate): a year the detector cannot parse is not rejected — the season
        // still matches and the year silently falls back to the current one, exactly like the
        // "missing year" case above. A file named Fall_1999.xlsx is therefore imported as Fall <this
        // year> instead of being refused. Documented here rather than corrected.
        test('falls back to the current year for an unparseable year instead of throwing', () => {
            const result = detectSeasonFromFilename('Fall_20.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(new Date().getFullYear())
        })

        test('falls back to the current year for a year outside the supported 20xx range', () => {
            const result = detectSeasonFromFilename('Fall_1999.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(new Date().getFullYear())
        })

        test('should throw error for empty filename', () => {
            expect(() => {
                detectSeasonFromFilename('')
            }).toThrow(SeasonDetectorError)
        })

        test('should throw error for null/undefined', () => {
            expect(() => {
                detectSeasonFromFilename(null as any)
            }).toThrow(SeasonDetectorError)
        })

        test('should work for reversed format (year then season)', () => {
            const result = detectSeasonFromFilename('2026_Fall.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })
    })

    describe('Edge cases', () => {
        test('should work with long filenames', () => {
            const result = detectSeasonFromFilename('Fall_2026_student_list_batch_1_final_approved.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })

        test('should work with multiple underscores', () => {
            const result = detectSeasonFromFilename('__Fall__2026__students__.xlsx')
            expect(result.season).toBe('Fall')
            expect(result.year).toBe(2026)
        })

        test('should extract from middle of filename', () => {
            const result = detectSeasonFromFilename('batch_Spring_2025_final.xlsx')
            expect(result.season).toBe('Spring')
            expect(result.year).toBe(2025)
        })

        test('should work with year at boundaries (2000)', () => {
            const result = detectSeasonFromFilename('Fall_2000.xlsx')
            expect(result.year).toBe(2000)
        })

        test('should work with year at boundaries (2099)', () => {
            const result = detectSeasonFromFilename('Winter_2099.xlsx')
            expect(result.year).toBe(2099)
        })
    })
})

/**
 * Unit tests for the project type detector.
 *
 * The regression these exist for: a DBI202 prompt asking students to analyse "Time Complexity"
 * and "Space Complexity" scored two algorithm signals and was rewritten to "algorithm", which
 * grades SQL work through a stdin/stdout judge.
 */

import { describe, test, expect } from '@jest/globals'
import { detectProjectType } from './ProjectTypeDetector.js'

const DBI202_PROMPT = `Bạn là giảng viên ra đề thực hành môn DBI202 về cơ sở dữ liệu.
Cung cấp một lược đồ cơ sở dữ liệu (schema) và mô tả các bảng cần thiết.
Chỉ định ngôn ngữ (SQL) và kỹ thuật cụ thể: stored procedures, triggers, indexing,
recursive CTEs, transaction management, query optimization techniques.
Phân tích độ phức tạp thời gian (Time Complexity) và không gian (Space Complexity).
Ít nhất một bài phải yêu cầu so sánh hoặc tối ưu câu truy vấn.`

const ALGORITHM_PROMPT = `Viết chương trình đọc input từ stdin gồm một mảng số nguyên, tìm subarray
có tổng lớn nhất và in ra màn hình kết quả. Phân tích time complexity, yêu cầu tốt hơn O(n^2).
Gợi ý: dynamic programming hoặc greedy.`

const FRONTEND_PROMPT = `Xây dựng giao diện quản lý sản phẩm bằng React, gọi API bằng fetch,
hiển thị danh sách dạng bảng, có phân trang và tìm kiếm. Yêu cầu responsive trên mobile.`

// An app that *uses* a database is not a SQL exercise. Both of these were relabelled
// "database" when the signal list still counted "cơ sở dữ liệu", "primary key", "transaction"
// and a bare "index" - the last one matching index.jsp.
const PRJ301_PROMPT = `Xây dựng ứng dụng web quản lý bán hàng bằng Java Servlet/JSP theo mô hình MVC.
Sinh viên phải kết nối cơ sở dữ liệu bằng JDBC, viết các truy vấn lấy danh sách sản phẩm.
Trang index.jsp hiển thị danh sách, có phân trang. Quản lý phiên đăng nhập bằng Session.
Yêu cầu transaction khi đặt hàng. Bảng Product có primary key, bảng Order có foreign key.`

const PRM392_PROMPT = `Xây dựng ứng dụng Android quản lý chi tiêu cá nhân.
Dùng Room database để lưu trữ giao dịch offline, đồng bộ với REST API khi có mạng.
Trigger cập nhật tổng chi tiêu mỗi khi thêm giao dịch mới.
Yêu cầu xử lý transaction khi chuyển tiền giữa hai ví.`

describe('detectProjectType', () => {
    describe('database prompts', () => {
        test('keeps "database" when the AI classified a DBI202 prompt correctly', () => {
            const result = detectProjectType('database', DBI202_PROMPT)
            expect(result.projectType).toBe('database')
            expect(result.changed).toBe(false)
        })

        test('rewrites to "database" when the AI called a SQL prompt an algorithm', () => {
            const result = detectProjectType('algorithm', DBI202_PROMPT)
            expect(result.projectType).toBe('database')
            expect(result.changed).toBe(true)
        })

        test('is not swayed by the two complexity-analysis mentions alone', () => {
            // The exact pair that used to be enough to force "algorithm".
            const result = detectProjectType('database', 'Phân tích Time Complexity và Space Complexity của câu truy vấn SQL trên bảng dữ liệu.')
            expect(result.projectType).toBe('database')
        })
    })

    describe('algorithm prompts', () => {
        test('still rewrites a mislabelled algorithm prompt, the case the fallback was written for', () => {
            const result = detectProjectType('backend', ALGORITHM_PROMPT)
            expect(result.projectType).toBe('algorithm')
            expect(result.changed).toBe(true)
        })

        test('leaves a correctly classified algorithm prompt alone', () => {
            const result = detectProjectType('algorithm', ALGORITHM_PROMPT)
            expect(result.projectType).toBe('algorithm')
            expect(result.changed).toBe(false)
        })
    })

    describe('apps that merely use a database', () => {
        test('leaves a PRJ301 Java web assignment as the AI classified it', () => {
            expect(detectProjectType('backend', PRJ301_PROMPT).projectType).toBe('backend')
            expect(detectProjectType('fullstack', PRJ301_PROMPT).projectType).toBe('fullstack')
        })

        test('leaves a PRM392 Android assignment as mobile', () => {
            const result = detectProjectType('mobile', PRM392_PROMPT)
            expect(result.projectType).toBe('mobile')
            expect(result.changed).toBe(false)
        })

        test('does not treat index.jsp as a database index', () => {
            expect(detectProjectType('backend', 'Trang index.jsp hiển thị danh sách sản phẩm.').changed).toBe(false)
        })

        test('does not treat a UI trigger or a money transfer transaction as SQL', () => {
            expect(detectProjectType('mobile', 'Trigger cập nhật giao diện sau mỗi transaction chuyển tiền.').changed).toBe(false)
        })
    })

    describe('everything else', () => {
        test('leaves a frontend prompt with no signals untouched', () => {
            const result = detectProjectType('frontend', FRONTEND_PROMPT)
            expect(result.projectType).toBe('frontend')
            expect(result.changed).toBe(false)
        })

        test('keeps the AI classification when neither side leads clearly', () => {
            const result = detectProjectType('backend', 'Dùng stdin và sql trong bài tập này.')
            expect(result.projectType).toBe('backend')
            expect(result.changed).toBe(false)
        })

        test('handles an empty prompt without throwing', () => {
            const result = detectProjectType('fullstack', '')
            expect(result.projectType).toBe('fullstack')
            expect(result.changed).toBe(false)
        })
    })
})

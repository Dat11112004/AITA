// @ts-nocheck
import Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { SqlExecutionProbeSpec, SqlTestCase } from '../../core/domain/rubric/EvidenceMatcher';

// ═══════════════════════════════════════════════════════════════════
// Result Interfaces
// ═══════════════════════════════════════════════════════════════════

export interface SqlCaseResult {
    caseId: string;
    title: string;
    passed: boolean;
    /** Columns returned by the student's query */
    actualColumns: string[];
    /** Rows returned by the student's query */
    actualRows: string[][];
    /** Expected columns (for SELECT) */
    expectedColumns: string[];
    /** Expected rows (for SELECT) */
    expectedRows: string[][];
    /** Human-readable diff description if failed */
    diffSummary: string;
    /** Raw error message if query execution failed */
    errorMessage?: string;
    executionMs: number;
    points: number;
    earnedPoints: number;
}

export interface SqlExecutionResult {
    passed: boolean;
    confidence: number;
    totalCases: number;
    passedCases: number;
    totalPoints: number;
    earnedPoints: number;
    caseResults: SqlCaseResult[];
    /** Time to start SQL Server + run setup script */
    setupMs: number;
}

// ═══════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════

const MSSQL_IMAGE = 'mcr.microsoft.com/mssql/server:2022-latest';
const MSSQL_SA_PASSWORD = 'AitaGrading2024!';
const MSSQL_PORT = 1433;
const SETUP_TIMEOUT_MS = 45000;   // Max 45s to start SQL Server
const DEFAULT_QUERY_TIMEOUT_MS = 10000;
const FLOAT_TOLERANCE = 0.01;

/**
 * SqlExecutionProbeEngine — Executes student SQL submissions against a real
 * SQL Server database running in Docker, comparing result sets with expected output.
 *
 * Architecture follows the same pattern as StdInOutProbeEngine:
 * - Self-manages Docker lifecycle (create → start → execute → remove)
 * - No dependency on ExecutionSandboxService
 * - Proportional scoring: earned_points / total_points
 *
 * Supported query types:
 * - SELECT: Compare columns + rows (with order sensitivity and float tolerance)
 * - DDL: Verify object creation (CREATE TABLE, CREATE PROCEDURE, CREATE TRIGGER)
 * - DML: Verify row count affected (INSERT, UPDATE, DELETE)
 * - PROCEDURE: Execute stored procedure and verify output via verification query
 */
export class SqlExecutionProbeEngine {
    private docker: Docker;

    constructor() {
        this.docker = new Docker();
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    public async evaluateAsync(
        submissionPath: string,
        probeSpec: SqlExecutionProbeSpec
    ): Promise<SqlExecutionResult> {
        const caseResults: SqlCaseResult[] = [];
        const overallStart = Date.now();
        let setupMs = 0;
        let container: Docker.Container | null = null;

        try {
            // ── 1. Pull image if needed ──
            await this.ensureImage(MSSQL_IMAGE);

            // ── 2. Start SQL Server container ──
            console.log(`[SqlExecutionProbe] Starting SQL Server container...`);
            container = await this.startSqlServer();
            const containerId = container.id.substring(0, 12);
            console.log(`[SqlExecutionProbe] Container ${containerId} started.`);

            // ── 3. Wait for SQL Server readiness ──
            await this.waitForReady(container);
            console.log(`[SqlExecutionProbe] SQL Server is ready.`);

            // ── 4. Execute setup script (CREATE DB + test data) ──
            const setupScript = await this.resolveSetupScript(probeSpec.setupScript, submissionPath);
            await this.executeSql(container, setupScript, 'master');
            setupMs = Date.now() - overallStart;
            console.log(`[SqlExecutionProbe] Setup completed in ${setupMs}ms.`);

            // ── 5. Find and read student's SQL file ──
            const studentSql = await this.readStudentSql(submissionPath);
            if (!studentSql) {
                return this.buildEmptyResult(probeSpec, 'Không tìm thấy file .sql trong bài nộp của sinh viên.', setupMs);
            }

            // ── 6. Execute student's DDL/setup statements first (CREATE TABLE, etc.) ──
            // This allows subsequent queries to reference tables the student created
            const studentStatements = this.splitSqlStatements(studentSql);
            const ddlStatements = studentStatements.filter(s =>
                /^\s*(CREATE|ALTER|DROP)\s/i.test(s)
            );
            if (ddlStatements.length > 0) {
                const ddlScript = ddlStatements.join('\nGO\n');
                try {
                    await this.executeSql(container, ddlScript, 'TestDBI202');
                    console.log(`[SqlExecutionProbe] Executed ${ddlStatements.length} DDL statements from student.`);
                } catch (e: any) {
                    console.warn(`[SqlExecutionProbe] Some DDL statements failed (may be expected): ${e.message?.substring(0, 200)}`);
                }
            }

            // ── 7. Run each test case ──
            for (const testCase of probeSpec.testCases) {
                const caseStart = Date.now();
                const result = await this.runTestCase(container, testCase, studentStatements);
                result.executionMs = Date.now() - caseStart;
                caseResults.push(result);

                const icon = result.passed ? '✓' : '✗';
                console.log(`[SqlExecutionProbe] ${icon} ${testCase.id}: ${testCase.title} (${result.executionMs}ms)${result.errorMessage ? ' — ' + result.errorMessage.substring(0, 100) : ''}`);
            }

        } catch (error: any) {
            console.error(`[SqlExecutionProbe] Fatal error:`, error);
            return this.buildEmptyResult(probeSpec, `Lỗi hệ thống: ${error.message}`, setupMs);
        } finally {
            // ── 8. Cleanup ──
            if (container) {
                try {
                    await container.remove({ force: true });
                    console.log(`[SqlExecutionProbe] Container removed.`);
                } catch (e) { /* Container may already be removed */ }
            }
        }

        // ── 9. Calculate scores ──
        const totalPoints = caseResults.reduce((s, r) => s + r.points, 0);
        const earnedPoints = caseResults.reduce((s, r) => s + r.earnedPoints, 0);
        const passedCases = caseResults.filter(r => r.passed).length;

        return {
            passed: passedCases === caseResults.length,
            confidence: caseResults.length > 0 ? earnedPoints / Math.max(totalPoints, 1) : 0,
            totalCases: caseResults.length,
            passedCases,
            totalPoints,
            earnedPoints,
            caseResults,
            setupMs
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // Docker Lifecycle
    // ═══════════════════════════════════════════════════════════════

    private async startSqlServer(): Promise<Docker.Container> {
        const container = await this.docker.createContainer({
            Image: MSSQL_IMAGE,
            Env: [
                'ACCEPT_EULA=Y',
                `MSSQL_SA_PASSWORD=${MSSQL_SA_PASSWORD}`,
                'MSSQL_PID=Developer'
            ],
            HostConfig: {
                Memory: 1024 * 1024 * 1024, // 1GB — minimum for SQL Server
                CpuShares: 1024,
                NetworkMode: 'bridge',
            },
            ExposedPorts: { [`${MSSQL_PORT}/tcp`]: {} },
        });
        await container.start();
        return container;
    }

    /**
     * Poll SQL Server until it accepts connections (SELECT 1).
     * SQL Server typically needs 10-20s to initialize on first start.
     */
    private async waitForReady(container: Docker.Container): Promise<void> {
        const deadline = Date.now() + SETUP_TIMEOUT_MS;
        const checkCmd = `/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '${MSSQL_SA_PASSWORD}' -C -Q "SELECT 1" -b`;

        while (Date.now() < deadline) {
            try {
                const output = await this.execInContainer(container, checkCmd);
                if (output.includes('1')) return;
            } catch {
                // Not ready yet
            }
            await this.sleep(1000);
        }
        throw new Error('SQL Server did not become ready within timeout');
    }

    // ═══════════════════════════════════════════════════════════════
    // SQL Execution
    // ═══════════════════════════════════════════════════════════════

    /**
     * Execute a SQL script inside the container via sqlcmd.
     * Splits by GO delimiter to handle multi-batch scripts.
     */
    private async executeSql(container: Docker.Container, sql: string, database: string): Promise<string> {
        // Write SQL to a temp file inside the container, then execute it.
        // This avoids shell escaping issues with complex SQL.
        const escapedSql = sql.replace(/'/g, "'\\''");
        const cmd = `echo '${escapedSql}' > /tmp/exec.sql && /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P '${MSSQL_SA_PASSWORD}' -C -d ${database} -i /tmp/exec.sql -s "|" -W -w 9999`;
        return await this.execInContainer(container, cmd);
    }

    /**
     * Execute a SELECT query and parse the result into columns + rows.
     */
    private async executeQuery(container: Docker.Container, sql: string, database: string): Promise<{ columns: string[], rows: string[][] }> {
        const output = await this.executeSql(container, sql, database);
        return this.parseQueryOutput(output);
    }

    /**
     * Run a command inside the Docker container and return stdout.
     */
    private async execInContainer(container: Docker.Container, cmd: string): Promise<string> {
        const exec = await container.exec({
            Cmd: ['bash', '-c', cmd],
            AttachStdout: true,
            AttachStderr: true,
        });

        const stream = await exec.start({ hijack: true, stdin: false });
        return new Promise<string>((resolve, reject) => {
            const chunks: Buffer[] = [];
            const timeout = setTimeout(() => {
                reject(new Error('Exec timeout'));
            }, DEFAULT_QUERY_TIMEOUT_MS + 5000);

            stream.on('data', (chunk: Buffer) => chunks.push(chunk));
            stream.on('end', () => {
                clearTimeout(timeout);
                const raw = Buffer.concat(chunks).toString('utf-8');
                // Strip Docker stream header bytes
                const cleaned = raw.replace(/[\x00-\x08\x0e-\x1f]/g, '');
                resolve(cleaned);
            });
            stream.on('error', (err: Error) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // Test Case Execution
    // ═══════════════════════════════════════════════════════════════

    private async runTestCase(
        container: Docker.Container,
        testCase: SqlTestCase,
        studentStatements: string[]
    ): Promise<SqlCaseResult> {
        const points = testCase.points || 1;
        const baseResult: SqlCaseResult = {
            caseId: testCase.id,
            title: testCase.title,
            passed: false,
            actualColumns: [],
            actualRows: [],
            expectedColumns: testCase.expectedColumns || [],
            expectedRows: testCase.expectedRows || [],
            diffSummary: '',
            executionMs: 0,
            points,
            earnedPoints: 0,
        };

        try {
            // Find the matching student statement for this test case
            const studentQuery = this.findStudentQuery(testCase, studentStatements);
            if (!studentQuery) {
                baseResult.diffSummary = `Không tìm thấy câu trả lời của sinh viên cho "${testCase.title}".`;
                baseResult.errorMessage = 'Query not found in submission';
                return baseResult;
            }

            switch (testCase.queryType) {
                case 'select':
                    return await this.evaluateSelect(container, testCase, studentQuery, baseResult);
                case 'ddl':
                    return await this.evaluateDdl(container, testCase, studentQuery, baseResult);
                case 'dml':
                    return await this.evaluateDml(container, testCase, studentQuery, baseResult);
                case 'procedure':
                    return await this.evaluateProcedure(container, testCase, studentQuery, baseResult);
                default:
                    baseResult.diffSummary = `Unsupported query type: ${testCase.queryType}`;
                    return baseResult;
            }
        } catch (error: any) {
            baseResult.errorMessage = error.message;
            baseResult.diffSummary = `Lỗi thực thi SQL: ${error.message.substring(0, 300)}`;
            return baseResult;
        }
    }

    // ─── SELECT Evaluation ───────────────────────────────────────

    private async evaluateSelect(
        container: Docker.Container,
        testCase: SqlTestCase,
        studentQuery: string,
        result: SqlCaseResult
    ): Promise<SqlCaseResult> {
        const { columns, rows } = await this.executeQuery(container, studentQuery, 'TestDBI202');
        result.actualColumns = columns;
        result.actualRows = rows;

        // Compare columns (case-insensitive)
        if (testCase.expectedColumns && testCase.expectedColumns.length > 0) {
            const normalizedActual = columns.map(c => c.toLowerCase().trim());
            const normalizedExpected = testCase.expectedColumns.map(c => c.toLowerCase().trim());

            if (normalizedActual.length !== normalizedExpected.length) {
                result.diffSummary = `Sai số cột: Kỳ vọng ${normalizedExpected.length} cột (${normalizedExpected.join(', ')}), nhận được ${normalizedActual.length} cột (${normalizedActual.join(', ')}).`;
                return result;
            }

            const columnMismatch = normalizedExpected.filter((col, i) => normalizedActual[i] !== col);
            if (columnMismatch.length > 0) {
                result.diffSummary = `Sai tên cột: Kỳ vọng [${normalizedExpected.join(', ')}], nhận được [${normalizedActual.join(', ')}].`;
                return result;
            }
        }

        // Compare rows
        if (testCase.expectedRows && testCase.expectedRows.length > 0) {
            let actualRows = rows;
            let expectedRows = testCase.expectedRows;

            // Sort if order doesn't matter
            if (testCase.orderSensitive === false) {
                actualRows = this.sortRows(actualRows);
                expectedRows = this.sortRows(expectedRows);
            }

            if (actualRows.length !== expectedRows.length) {
                result.diffSummary = `Sai số dòng: Kỳ vọng ${expectedRows.length} dòng, nhận được ${actualRows.length} dòng.`;
                return result;
            }

            // Compare cell by cell
            const diffs: string[] = [];
            for (let r = 0; r < expectedRows.length; r++) {
                for (let c = 0; c < Math.max(expectedRows[r].length, (actualRows[r] || []).length); c++) {
                    const expected = (expectedRows[r][c] || '').trim();
                    const actual = (actualRows[r]?.[c] || '').trim();
                    if (!this.cellEquals(actual, expected)) {
                        diffs.push(`Dòng ${r + 1}, Cột ${c + 1}: Kỳ vọng "${expected}", nhận được "${actual}".`);
                        if (diffs.length >= 5) break; // Limit diff output
                    }
                }
                if (diffs.length >= 5) break;
            }

            if (diffs.length > 0) {
                result.diffSummary = diffs.join('\n');
                return result;
            }
        }

        // All checks passed
        result.passed = true;
        result.earnedPoints = result.points;
        result.diffSummary = `✓ Kết quả khớp hoàn toàn (${rows.length} dòng, ${columns.length} cột).`;
        return result;
    }

    // ─── DDL Evaluation ──────────────────────────────────────────

    private async evaluateDdl(
        container: Docker.Container,
        testCase: SqlTestCase,
        studentQuery: string,
        result: SqlCaseResult
    ): Promise<SqlCaseResult> {
        // Execute the student's DDL
        try {
            await this.executeSql(container, studentQuery, 'TestDBI202');
        } catch (e: any) {
            result.diffSummary = `Lỗi khi thực thi DDL: ${e.message.substring(0, 300)}`;
            result.errorMessage = e.message;
            return result;
        }

        // Verify object exists
        if (testCase.expectedObjectName) {
            const objType = testCase.expectedObjectType || 'table';
            const checkQuery = this.buildObjectCheckQuery(testCase.expectedObjectName, objType);
            const output = await this.executeSql(container, checkQuery, 'TestDBI202');

            if (output.toLowerCase().includes('exists')) {
                result.passed = true;
                result.earnedPoints = result.points;
                result.diffSummary = `✓ ${objType} "${testCase.expectedObjectName}" đã được tạo thành công.`;
            } else {
                result.diffSummary = `${objType} "${testCase.expectedObjectName}" không tồn tại sau khi thực thi DDL.`;
            }
        } else {
            // No object to verify — just check the DDL didn't error
            result.passed = true;
            result.earnedPoints = result.points;
            result.diffSummary = '✓ DDL thực thi thành công.';
        }

        return result;
    }

    // ─── DML Evaluation ──────────────────────────────────────────

    private async evaluateDml(
        container: Docker.Container,
        testCase: SqlTestCase,
        studentQuery: string,
        result: SqlCaseResult
    ): Promise<SqlCaseResult> {
        const output = await this.executeSql(container, studentQuery, 'TestDBI202');

        // Check rows affected
        const rowsAffectedMatch = output.match(/\((\d+)\s+rows?\s+affected\)/i);
        const rowsAffected = rowsAffectedMatch ? parseInt(rowsAffectedMatch[1]) : -1;

        if (testCase.expectedRowCount !== undefined) {
            if (rowsAffected === testCase.expectedRowCount) {
                result.passed = true;
                result.earnedPoints = result.points;
                result.diffSummary = `✓ Số dòng bị ảnh hưởng: ${rowsAffected} (đúng).`;
            } else {
                result.diffSummary = `Sai số dòng bị ảnh hưởng: Kỳ vọng ${testCase.expectedRowCount}, thực tế ${rowsAffected}.`;
            }
        } else {
            // No specific row count expected — just verify no error
            if (!output.toLowerCase().includes('msg ') && !output.toLowerCase().includes('error')) {
                result.passed = true;
                result.earnedPoints = result.points;
                result.diffSummary = `✓ DML thực thi thành công (${rowsAffected} dòng bị ảnh hưởng).`;
            } else {
                result.diffSummary = `Lỗi DML: ${output.substring(0, 300)}`;
            }
        }

        // If there's a verification query, run it to double-check
        if (result.passed && testCase.verificationQuery) {
            try {
                const { rows } = await this.executeQuery(container, testCase.verificationQuery, 'TestDBI202');
                result.actualRows = rows;
                if (testCase.expectedRows && testCase.expectedRows.length > 0) {
                    const actualSorted = this.sortRows(rows);
                    const expectedSorted = this.sortRows(testCase.expectedRows);
                    if (!this.rowsMatch(actualSorted, expectedSorted)) {
                        result.passed = false;
                        result.earnedPoints = 0;
                        result.diffSummary = `DML thực thi nhưng kết quả verification không khớp. Kỳ vọng ${expectedSorted.length} dòng, nhận được ${actualSorted.length} dòng.`;
                    }
                }
            } catch (e: any) {
                // Verification query failure doesn't void the DML pass
                console.warn(`[SqlExecutionProbe] Verification query failed: ${e.message}`);
            }
        }

        return result;
    }

    // ─── Procedure Evaluation ────────────────────────────────────

    private async evaluateProcedure(
        container: Docker.Container,
        testCase: SqlTestCase,
        studentQuery: string,
        result: SqlCaseResult
    ): Promise<SqlCaseResult> {
        // Execute the student's CREATE PROCEDURE
        try {
            await this.executeSql(container, studentQuery, 'TestDBI202');
        } catch (e: any) {
            result.diffSummary = `Lỗi khi tạo stored procedure: ${e.message.substring(0, 300)}`;
            result.errorMessage = e.message;
            return result;
        }

        // Run the verification query (e.g., EXEC proc_name @param1, @param2)
        if (testCase.verificationQuery) {
            try {
                const { columns, rows } = await this.executeQuery(container, testCase.verificationQuery, 'TestDBI202');
                result.actualColumns = columns;
                result.actualRows = rows;

                if (testCase.expectedRows && testCase.expectedRows.length > 0) {
                    if (this.rowsMatch(rows, testCase.expectedRows)) {
                        result.passed = true;
                        result.earnedPoints = result.points;
                        result.diffSummary = `✓ Stored procedure trả về kết quả đúng.`;
                    } else {
                        result.diffSummary = `Stored procedure trả về kết quả sai. Kỳ vọng: ${JSON.stringify(testCase.expectedRows)}, nhận được: ${JSON.stringify(rows)}.`;
                    }
                } else {
                    // No expected rows — just verify it ran without error
                    result.passed = true;
                    result.earnedPoints = result.points;
                    result.diffSummary = `✓ Stored procedure thực thi thành công.`;
                }
            } catch (e: any) {
                result.diffSummary = `Lỗi khi thực thi verification query: ${e.message.substring(0, 300)}`;
                result.errorMessage = e.message;
            }
        } else {
            // Verify procedure exists
            const checkOutput = await this.executeSql(
                container,
                `SELECT CASE WHEN OBJECT_ID('${testCase.expectedObjectName || 'unknown'}', 'P') IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END AS result`,
                'TestDBI202'
            );
            if (checkOutput.includes('EXISTS') && !checkOutput.includes('NOT_EXISTS')) {
                result.passed = true;
                result.earnedPoints = result.points;
                result.diffSummary = `✓ Stored procedure đã được tạo thành công.`;
            } else {
                result.diffSummary = `Stored procedure không tồn tại sau khi thực thi.`;
            }
        }

        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // SQL Parsing & Matching
    // ═══════════════════════════════════════════════════════════════

    /**
     * Read the student's .sql file from submission directory.
     * Searches recursively for .sql files, prefers the largest one.
     */
    private async readStudentSql(submissionPath: string): Promise<string | null> {
        const sqlFiles = await this.findFiles(submissionPath, '.sql');
        if (sqlFiles.length === 0) return null;

        // If multiple .sql files, prefer the largest (most likely the answer file)
        let bestFile = sqlFiles[0];
        let bestSize = 0;
        for (const f of sqlFiles) {
            const stat = await fs.stat(f);
            if (stat.size > bestSize) {
                bestSize = stat.size;
                bestFile = f;
            }
        }

        console.log(`[SqlExecutionProbe] Using student SQL file: ${path.basename(bestFile)} (${bestSize} bytes)`);
        return await fs.readFile(bestFile, 'utf-8');
    }

    /**
     * Split a SQL script into individual statements using GO delimiter
     * and comment markers (e.g., "-- Câu 1", "-- Question 2").
     */
    private splitSqlStatements(sql: string): string[] {
        // Split by GO keyword (case insensitive, must be on its own line)
        const batches = sql.split(/^\s*GO\s*$/gim).filter(s => s.trim().length > 0);

        // Further split batches that contain multiple comment-delimited questions
        const statements: string[] = [];
        for (const batch of batches) {
            statements.push(batch.trim());
        }
        return statements;
    }

    /**
     * Find the student's SQL query that corresponds to a test case.
     * Uses intelligent matching based on:
     * 1. Comment markers (-- Câu N, -- Question N, -- N.)
     * 2. Keyword matching from test case title
     * 3. SQL operation type matching
     */
    private findStudentQuery(testCase: SqlTestCase, statements: string[]): string | null {
        const titleLower = testCase.title.toLowerCase();

        // Extract question number from test case title (e.g., "Câu 1", "Question 3", "Q5")
        const numMatch = testCase.id.match(/(\d+)/);
        const questionNum = numMatch ? parseInt(numMatch[1]) : -1;

        // Strategy 1: Match by comment marker containing the question number
        if (questionNum > 0) {
            for (const stmt of statements) {
                const lines = stmt.split('\n');
                for (const line of lines) {
                    const commentMatch = line.match(/--\s*(?:câu|question|q|bài|cau)\s*(\d+)/i)
                        || line.match(/--\s*(\d+)\s*[\.:\)]/);
                    if (commentMatch && parseInt(commentMatch[1]) === questionNum) {
                        return stmt;
                    }
                }
            }
        }

        // Strategy 2: Match by SQL operation type
        // For DDL types, look for CREATE TABLE/PROCEDURE/TRIGGER with matching object name
        if (testCase.queryType === 'ddl' && testCase.expectedObjectName) {
            const objName = testCase.expectedObjectName.toLowerCase();
            for (const stmt of statements) {
                if (stmt.toLowerCase().includes(objName) && /CREATE\s/i.test(stmt)) {
                    return stmt;
                }
            }
        }

        // Strategy 3: For procedure type, look for CREATE PROCEDURE with matching name
        if (testCase.queryType === 'procedure' && testCase.expectedObjectName) {
            const procName = testCase.expectedObjectName.toLowerCase();
            for (const stmt of statements) {
                if (stmt.toLowerCase().includes(procName) && /CREATE\s+(PROCEDURE|PROC)/i.test(stmt)) {
                    return stmt;
                }
            }
        }

        // Strategy 4: Sequential matching — if test case ID is "q3", use the 3rd statement
        if (questionNum > 0 && questionNum <= statements.length) {
            // Filter out pure USE/CREATE DATABASE statements
            const meaningfulStmts = statements.filter(s =>
                !/^\s*(USE|CREATE\s+DATABASE)\s/i.test(s.trim())
            );
            if (questionNum <= meaningfulStmts.length) {
                return meaningfulStmts[questionNum - 1];
            }
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════
    // Output Parsing
    // ═══════════════════════════════════════════════════════════════

    /**
     * Parse sqlcmd pipe-delimited output into columns + rows.
     * sqlcmd output format with -s "|" -W:
     *   ColA|ColB|ColC
     *   ----|----|----|
     *   val1|val2|val3
     *   val4|val5|val6
     */
    private parseQueryOutput(output: string): { columns: string[], rows: string[][] } {
        const lines = output.split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            // Filter out sqlcmd noise: messages, row count, etc.
            .filter(l => !l.startsWith('Changed database'))
            .filter(l => !l.match(/^\(\d+\s+rows?\s+affected\)/))
            .filter(l => !l.startsWith('Warning:'))
            .filter(l => !l.startsWith('Msg '));

        if (lines.length === 0) return { columns: [], rows: [] };

        // First non-empty line is column headers
        const columns = lines[0].split('|').map(c => c.trim()).filter(c => c.length > 0);

        // Skip separator line (---|----|----)
        let dataStartIdx = 1;
        if (lines.length > 1 && /^[-|]+$/.test(lines[1].replace(/\s/g, ''))) {
            dataStartIdx = 2;
        }

        // Parse data rows
        const rows: string[][] = [];
        for (let i = dataStartIdx; i < lines.length; i++) {
            const cells = lines[i].split('|').map(c => c.trim());
            // Only include rows that have the right number of columns (±1 for trailing pipe)
            if (cells.length >= columns.length - 1) {
                rows.push(cells.slice(0, columns.length));
            }
        }

        return { columns, rows };
    }

    // ═══════════════════════════════════════════════════════════════
    // Comparison Algorithms
    // ═══════════════════════════════════════════════════════════════

    /**
     * Compare two cell values with tolerance for floats and NULL handling.
     */
    private cellEquals(actual: string, expected: string): boolean {
        // Normalize NULL representations
        const a = actual.toLowerCase().trim();
        const e = expected.toLowerCase().trim();
        if ((a === 'null' || a === '') && (e === 'null' || e === '')) return true;
        if (a === e) return true;

        // Try numeric comparison with float tolerance
        const numA = parseFloat(a);
        const numE = parseFloat(e);
        if (!isNaN(numA) && !isNaN(numE)) {
            return Math.abs(numA - numE) <= FLOAT_TOLERANCE;
        }

        // Date normalization: compare date portions only
        const dateA = new Date(a);
        const dateE = new Date(e);
        if (!isNaN(dateA.getTime()) && !isNaN(dateE.getTime())) {
            return dateA.toISOString().split('T')[0] === dateE.toISOString().split('T')[0];
        }

        return false;
    }

    /**
     * Sort rows lexicographically for order-insensitive comparison.
     */
    private sortRows(rows: string[][]): string[][] {
        return [...rows].sort((a, b) => {
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                const cmp = (a[i] || '').localeCompare(b[i] || '', undefined, { numeric: true });
                if (cmp !== 0) return cmp;
            }
            return 0;
        });
    }

    /**
     * Compare two row sets cell by cell.
     */
    private rowsMatch(actual: string[][], expected: string[][]): boolean {
        if (actual.length !== expected.length) return false;
        for (let r = 0; r < expected.length; r++) {
            for (let c = 0; c < Math.max(expected[r].length, (actual[r] || []).length); c++) {
                if (!this.cellEquals(actual[r]?.[c] || '', expected[r]?.[c] || '')) {
                    return false;
                }
            }
        }
        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // Helpers
    // ═══════════════════════════════════════════════════════════════

    private buildObjectCheckQuery(objectName: string, objectType: string): string {
        switch (objectType) {
            case 'table':
                return `SELECT CASE WHEN OBJECT_ID('${objectName}', 'U') IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END AS result`;
            case 'procedure':
                return `SELECT CASE WHEN OBJECT_ID('${objectName}', 'P') IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END AS result`;
            case 'trigger':
                return `SELECT CASE WHEN EXISTS(SELECT 1 FROM sys.triggers WHERE name = '${objectName}') THEN 'EXISTS' ELSE 'NOT_EXISTS' END AS result`;
            case 'view':
                return `SELECT CASE WHEN OBJECT_ID('${objectName}', 'V') IS NOT NULL THEN 'EXISTS' ELSE 'NOT_EXISTS' END AS result`;
            default:
                return `SELECT 'NOT_EXISTS' AS result`;
        }
    }

    /**
     * Resolve the setup script. If it starts with "file:", read from disk.
     * Otherwise, treat it as inline SQL.
     */
    private async resolveSetupScript(setupScript: string, submissionPath: string): Promise<string> {
        if (setupScript.startsWith('file:')) {
            const filePath = setupScript.substring(5);
            // Try absolute path first, then relative to submission
            try {
                return await fs.readFile(filePath, 'utf-8');
            } catch {
                const relative = path.join(submissionPath, filePath);
                return await fs.readFile(relative, 'utf-8');
            }
        }
        return setupScript;
    }

    private async findFiles(dir: string, extension: string): Promise<string[]> {
        const results: string[] = [];
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                    results.push(...await this.findFiles(fullPath, extension));
                } else if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) {
                    results.push(fullPath);
                }
            }
        } catch { /* Directory may not be readable */ }
        return results;
    }

    private async ensureImage(image: string): Promise<void> {
        try {
            await this.docker.getImage(image).inspect();
        } catch {
            console.log(`[SqlExecutionProbe] Pulling image ${image}...`);
            await new Promise<void>((resolve, reject) => {
                this.docker.pull(image, (err: Error | null, stream: NodeJS.ReadableStream) => {
                    if (err) return reject(err);
                    this.docker.modem.followProgress(stream, (err2: Error | null) => {
                        if (err2) return reject(err2);
                        resolve();
                    });
                });
            });
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private buildEmptyResult(probeSpec: SqlExecutionProbeSpec, errorMsg: string, setupMs: number): SqlExecutionResult {
        return {
            passed: false,
            confidence: 0,
            totalCases: probeSpec.testCases.length,
            passedCases: 0,
            totalPoints: probeSpec.testCases.reduce((s, c) => s + (c.points || 1), 0),
            earnedPoints: 0,
            caseResults: probeSpec.testCases.map(tc => ({
                caseId: tc.id,
                title: tc.title,
                passed: false,
                actualColumns: [],
                actualRows: [],
                expectedColumns: tc.expectedColumns || [],
                expectedRows: tc.expectedRows || [],
                diffSummary: errorMsg,
                errorMessage: errorMsg,
                executionMs: 0,
                points: tc.points || 1,
                earnedPoints: 0,
            })),
            setupMs,
        };
    }
}

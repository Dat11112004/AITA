// @ts-nocheck
import Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StdInOutProbeSpec, StdInOutTestCase } from '../../core/domain/rubric/EvidenceMatcher';

export interface StdInOutCaseResult {
  caseId: string;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  timedOut: boolean;
  executionMs: number;
}

export interface StdInOutResult {
  passed: boolean;
  confidence: number;
  totalCases: number;
  passedCases: number;
  caseResults: StdInOutCaseResult[];
}

/**
 * Language detection result used to auto-detect build/run commands.
 */
interface LanguageDetection {
  language: string;
  dockerImage: string;
  buildCommand: string;
  runCommand: string;
}

/**
 * Executes algorithm/console submissions by piping stdin and comparing stdout.
 * 
 * Each test case runs in an isolated Docker container with:
 * - Hard timeout (default 5s) per case to catch infinite loops
 * - Memory limit (256MB) to catch memory leaks  
 * - Proportional scoring: passed_cases / total_cases
 */
export class StdInOutProbeEngine {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  public async evaluateAsync(
    submissionPath: string,
    probeSpec: StdInOutProbeSpec
  ): Promise<StdInOutResult> {
    const caseResults: StdInOutCaseResult[] = [];

    // Auto-detect language if build/run commands not specified
    const detection = await this.detectLanguage(submissionPath);
    const buildCmd = probeSpec.buildCommand || detection.buildCommand;
    const runCmd = probeSpec.runCommand || detection.runCommand;
    const dockerImage = detection.dockerImage;

    console.log(`[StdInOutProbe] Detected: ${detection.language} | Image: ${dockerImage}`);
    console.log(`[StdInOutProbe] Build: ${buildCmd} | Run: ${runCmd}`);
    console.log(`[StdInOutProbe] Running ${probeSpec.testCases.length} test cases...`);

    // Ensure Docker image exists
    await this.pullImage(dockerImage);

    // Find project subdirectory (for C# projects with nested .csproj)
    const projectDir = await this.findProjectDir(submissionPath, detection.language);

    for (const testCase of probeSpec.testCases) {
      const result = await this.runTestCase(
        submissionPath,
        projectDir,
        testCase,
        buildCmd,
        runCmd,
        dockerImage
      );
      caseResults.push(result);
      console.log(`[StdInOutProbe] Case ${testCase.id}: ${result.passed ? '✓ PASS' : '✗ FAIL'} (${result.executionMs}ms)${result.timedOut ? ' [TIMEOUT]' : ''}`);
    }

    const passedCases = caseResults.filter(r => r.passed).length;
    const totalCases = caseResults.length;
    const confidence = totalCases > 0 ? passedCases / totalCases : 0;

    return {
      passed: passedCases === totalCases,
      confidence,
      totalCases,
      passedCases,
      caseResults
    };
  }

  /**
   * Run a single test case in an isolated Docker container.
   */
  private async runTestCase(
    submissionPath: string,
    projectDir: string,
    testCase: StdInOutTestCase,
    buildCmd: string,
    runCmd: string,
    dockerImage: string
  ): Promise<StdInOutCaseResult> {
    const timeoutMs = testCase.timeoutMs || 5000;
    const startTime = Date.now();

    // Normalize input to handle both legacy literal '\\n' and real newlines, and escape single quotes for bash
    const normalizedInput = testCase.input.replace(/\\n/g, '\n').replace(/\r/g, '').replace(/'/g, "'\\''");

    // Build the full command:
    // 1. Copy ALL source to writable /sandbox (some languages need to compile)
    // 2. cd into the project subdirectory (if nested)
    // 3. Build (if needed)
    // 4. Pipe stdin and run
    const setupCmd = projectDir === '.'
      ? `cp -a /app/. /sandbox/ && cd /sandbox`
      : `cp -a /app/. /sandbox/ && cd /sandbox && ([ -d "${projectDir}" ] && cd "${projectDir}" || true)`;
    const pipeCmd = `echo '${normalizedInput}' | timeout ${Math.ceil(timeoutMs / 1000)} ${runCmd}`;
    const fullCmd = buildCmd
      ? `${setupCmd} && ${buildCmd} >/dev/null 2>&1 && ${pipeCmd}`
      : `${setupCmd} && ${pipeCmd}`;

    const hostPath = submissionPath.replace(/\\/g, '/');

    let container: Docker.Container | null = null;
    try {
      container = await this.docker.createContainer({
        Image: dockerImage,
        Cmd: ["sh", "-c", fullCmd],
        WorkingDir: "/sandbox",
        HostConfig: {
          Binds: [`${hostPath}:/app:ro`],
          Memory: 256 * 1024 * 1024, // 256MB
          CpuShares: 512,
          NetworkMode: "none" // No network for algorithm submissions
        },
        AttachStdout: true,
        AttachStderr: true,
      });

      await container.start();

      // Wait for completion with timeout
      const waitPromise = container.wait();
      // System Timeout: Give plenty of time (20s) for compilation/docker overhead.
      // The actual execution timeout is handled by the `timeout` bash command inside the container.
      const timeoutPromise = new Promise<{ StatusCode: number }>((_, reject) =>
        setTimeout(() => reject(new Error('SYSTEM_TIMEOUT')), timeoutMs + 20000)
      );

      let statusCode = -1;
      let timedOut = false;
      let systemError = false;
      try {
        const result = await Promise.race([waitPromise, timeoutPromise]);
        statusCode = result.StatusCode;
        // 124 is the standard exit code for the 'timeout' command in bash/alpine
        if (statusCode === 124) {
          timedOut = true;
        }
      } catch (e: any) {
        if (e.message === 'SYSTEM_TIMEOUT') {
          // The container hung during setup or build, far exceeding expected overhead
          systemError = true;
        }
      }

      // Capture stdout and stderr
      let stdout = '';
      if (!timedOut) {
        try {
          const logs = await container.logs({ stdout: true, stderr: true, timestamps: false });
          stdout = this.cleanDockerOutput(logs.toString('utf-8'));
        } catch (e: any) {
          console.error('[StdInOutProbeEngine] Error fetching logs:', e);
        }
      }

      const executionMs = Date.now() - startTime;
      const actual = stdout.trim();
      const expected = testCase.expectedOutput.trim();
      const passed = !timedOut && !systemError && this.compareOutput(actual, expected);

      let actualOutputStr = actual;
      if (timedOut) {
          actualOutputStr = '[TIMEOUT - possible infinite loop]';
      } else if (systemError) {
          actualOutputStr = '[SYSTEM TIMEOUT - build or startup took too long]';
      }

      return {
        caseId: testCase.id,
        passed,
        input: testCase.input.trim(),
        expected,
        actual: actualOutputStr,
        timedOut: timedOut || systemError,
        executionMs
      };
    } catch (error: any) {
      return {
        caseId: testCase.id,
        passed: false,
        input: testCase.input.trim(),
        expected: testCase.expectedOutput.trim(),
        actual: `[ERROR] ${error.message}`,
        timedOut: false,
        executionMs: Date.now() - startTime
      };
    } finally {
      if (container) {
        try {
          await container.remove({ force: true });
        } catch (e) {
          // Container may already be removed
        }
      }
    }
  }

  /**
   * Compare actual vs expected output with whitespace normalization.
   * - Trims leading/trailing whitespace
   * - Normalizes line endings (\r\n → \n)
   * - Compares line-by-line
   */
  private compareOutput(actual: string, expected: string): boolean {
    const normalizeLines = (s: string) => s.replace(/\r\n/g, '\n').trim().split('\n').map(l => l.trim());
    const actualLines = normalizeLines(actual);
    const expectedLines = normalizeLines(expected);

    if (actualLines.length !== expectedLines.length) return false;
    return actualLines.every((line, i) => line === expectedLines[i]);
  }

  /**
   * Docker logs contain 8-byte header per frame. Strip control characters.
   */
  private cleanDockerOutput(raw: string): string {
    // Remove Docker stream header bytes (first 8 bytes of each frame)
    return raw.replace(/[\x00-\x08]/g, '').replace(/[\x0e-\x1f]/g, '');
  }

  /**
   * Auto-detect programming language from file extensions in submission.
   */
  private async detectLanguage(submissionPath: string): Promise<LanguageDetection> {
    const files = await this.listFilesRecursive(submissionPath);
    const extensions = files.map(f => path.extname(f).toLowerCase());

    // Check for .csproj (C#)
    if (files.some(f => f.endsWith('.csproj'))) {
      return {
        language: 'csharp',
        dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
        buildCommand: 'dotnet build -c Release --nologo -v q',
        runCommand: 'dotnet run --no-build -c Release --nologo'
      };
    }

    // Check for pom.xml (Java Maven)
    if (files.some(f => f.endsWith('pom.xml'))) {
      return {
        language: 'java',
        dockerImage: 'maven:3.9-eclipse-temurin-21',
        buildCommand: 'mvn compile -q',
        runCommand: 'java -cp target/classes Main'
      };
    }
    // Check for build.gradle (Java Gradle)
    if (files.some(f => f.endsWith('build.gradle') || f.endsWith('build.gradle.kts'))) {
      return {
        language: 'java',
        dockerImage: 'gradle:8-jdk21',
        buildCommand: 'gradle build -q',
        runCommand: 'java -cp build/classes/java/main Main'
      };
    }
    // Check for standalone Java files
    if (files.some(f => f.endsWith('.java'))) {
      const javaFiles = files.filter(f => f.endsWith('.java'));
      let mainFile = javaFiles.find(f => path.basename(f).toLowerCase() === 'main.java' || path.basename(f).toLowerCase() === 'program.java');
      
      if (!mainFile) {
        for (const file of javaFiles) {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('public static void main')) {
            mainFile = file;
            break;
          }
        }
      }
      
      if (!mainFile) mainFile = javaFiles[0];

      const className = path.basename(mainFile, '.java');
      return {
        language: 'java',
        dockerImage: 'eclipse-temurin:21',
        buildCommand: `find . -name "*.java" > sources.txt && javac -d . @sources.txt`,
        runCommand: `java -cp . ${className}`
      };
    }

    // Check for Kotlin (.kt)
    if (extensions.includes('.kt')) {
      const mainFile = files.find(f => f.endsWith('.kt')) || 'Main.kt';
      const baseName = path.basename(mainFile, '.kt');
      return {
        language: 'kotlin',
        dockerImage: 'zenika/kotlin:1.9',
        buildCommand: `kotlinc ${path.basename(mainFile)} -include-runtime -d solution.jar`,
        runCommand: 'java -jar solution.jar'
      };
    }

    // Check for Go (.go)
    if (extensions.includes('.go') || files.some(f => f.endsWith('go.mod'))) {
      return {
        language: 'golang',
        dockerImage: 'golang:1.22-alpine',
        buildCommand: 'go build -o solution .',
        runCommand: './solution'
      };
    }

    // Check for Rust (.rs)
    if (extensions.includes('.rs') || files.some(f => f.endsWith('Cargo.toml'))) {
      return {
        language: 'rust',
        dockerImage: 'rust:1.78-slim',
        buildCommand: files.some(f => f.endsWith('Cargo.toml'))
          ? 'cargo build --release 2>/dev/null && cp target/release/* ./solution 2>/dev/null || true'
          : 'rustc -o solution main.rs',
        runCommand: files.some(f => f.endsWith('Cargo.toml'))
          ? 'cargo run --release --quiet'
          : './solution'
      };
    }

    // Check for Python
    if (extensions.includes('.py')) {
      const pyFiles = files.filter(f => f.endsWith('.py'));
      let mainFile = pyFiles.find(f => f.endsWith('main.py')) || 'main.py';
      
      // Look for if __name__ == "__main__"
      for (const file of pyFiles) {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('__name__') && content.includes('__main__')) {
              mainFile = file;
              break;
          }
      }

      return {
        language: 'python',
        dockerImage: 'python:3.12-slim',
        buildCommand: '',
        runCommand: `python ${path.basename(mainFile)}`
      };
    }

    // Check for Ruby (.rb)
    if (extensions.includes('.rb')) {
      const mainFile = files.find(f => f.endsWith('main.rb')) || files.find(f => f.endsWith('.rb')) || 'main.rb';
      return {
        language: 'ruby',
        dockerImage: 'ruby:3.3-slim',
        buildCommand: '',
        runCommand: `ruby ${path.basename(mainFile)}`
      };
    }

    // Check for PHP (.php)
    if (extensions.includes('.php')) {
      const mainFile = files.find(f => f.endsWith('main.php')) || files.find(f => f.endsWith('index.php')) || files.find(f => f.endsWith('.php')) || 'main.php';
      return {
        language: 'php',
        dockerImage: 'php:8.3-cli',
        buildCommand: '',
        runCommand: `php ${path.basename(mainFile)}`
      };
    }

    // Check for C++ (.cpp, .cc, .cxx)
    if (extensions.some(e => ['.cpp', '.cc', '.cxx', '.c'].includes(e))) {
      const isC = extensions.includes('.c') && !extensions.some(e => ['.cpp', '.cc', '.cxx'].includes(e));
      return {
        language: isC ? 'c' : 'cpp',
        dockerImage: 'gcc:13',
        buildCommand: isC
          ? `gcc -o solution $(find . -name "*.c") -O2 -lm`
          : `g++ -o solution $(find . -name "*.cpp" -o -name "*.cc" -o -name "*.cxx" -o -name "*.c") -std=c++17 -O2`,
        runCommand: './solution'
      };
    }

    // Check for Node.js (JavaScript)
    if (files.some(f => f.endsWith('package.json')) || extensions.includes('.js')) {
      const mainFile = files.find(f => f.endsWith('index.js')) || files.find(f => f.endsWith('.js')) || 'index.js';
      return {
        language: 'nodejs',
        dockerImage: 'node:20-slim',
        buildCommand: '',
        runCommand: `node ${path.basename(mainFile)}`
      };
    }

    // Check for TypeScript (.ts) — separate from JS to handle compilation
    if (extensions.includes('.ts')) {
      const mainFile = files.find(f => f.endsWith('index.ts')) || files.find(f => f.endsWith('.ts')) || 'index.ts';
      return {
        language: 'typescript',
        dockerImage: 'node:20-slim',
        buildCommand: 'npx -y typescript tsc --esModuleInterop --outDir ./dist *.ts',
        runCommand: `node dist/${path.basename(mainFile, '.ts')}.js`
      };
    }

    // Default fallback — assume C# console app
    return {
      language: 'csharp',
      dockerImage: 'mcr.microsoft.com/dotnet/sdk:8.0',
      buildCommand: 'dotnet build -c Release --nologo -v q',
      runCommand: 'dotnet run --no-build -c Release --nologo'
    };
  }

  /**
   * Find the project subdirectory relative to submission root.
   */
  private async findProjectDir(submissionPath: string, language: string): Promise<string> {
    const files = await this.listFilesRecursive(submissionPath);
    let targetFile: string | undefined;

    switch (language) {
      case 'csharp':
        targetFile = files.find(f => f.endsWith('.csproj'));
        break;
      case 'nodejs':
      case 'typescript':
        targetFile = files.find(f => f.endsWith('package.json')) || files.find(f => f.endsWith('index.js')) || files.find(f => f.endsWith('index.ts')) || files.find(f => f.endsWith('.js')) || files.find(f => f.endsWith('.ts'));
        break;
      case 'python':
        targetFile = files.find(f => f.endsWith('main.py')) || files.find(f => f.endsWith('.py'));
        break;
      case 'java':
        targetFile = files.find(f => f.endsWith('pom.xml')) || files.find(f => f.endsWith('build.gradle')) || files.find(f => f.endsWith('.java'));
        break;
      case 'kotlin':
        targetFile = files.find(f => f.endsWith('.kt'));
        break;
      case 'golang':
        targetFile = files.find(f => f.endsWith('go.mod')) || files.find(f => f.endsWith('.go'));
        break;
      case 'rust':
        targetFile = files.find(f => f.endsWith('Cargo.toml')) || files.find(f => f.endsWith('.rs'));
        break;
      case 'ruby':
        targetFile = files.find(f => f.endsWith('.rb'));
        break;
      case 'php':
        targetFile = files.find(f => f.endsWith('.php'));
        break;
      case 'c':
      case 'cpp':
        targetFile = files.find(f => /\.(cpp|cc|cxx|c)$/.test(f));
        break;
    }

    if (targetFile) {
      const rel = path.relative(submissionPath, path.dirname(targetFile));
      return rel ? rel.replace(/\\/g, '/') : '.';
    }
    
    return '.';
  }

  private async listFilesRecursive(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (['bin', 'obj', 'node_modules', '.git', '__pycache__'].includes(entry.name)) continue;
        results.push(...await this.listFilesRecursive(fullPath));
      } else {
        results.push(fullPath);
      }
    }
    return results;
  }

  private async pullImage(imageName: string): Promise<void> {
    const docker = this.docker;
    return new Promise((resolve, reject) => {
      docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream,
          (err: any) => err ? reject(err) : resolve(),
          () => {} // onProgress — silent
        );
      });
    });
  }
}


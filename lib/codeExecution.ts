import axios from 'axios';

const PISTON_API = 'https://emkc.org/api/v2/piston';

interface ExecutionResult {
  output: string;
  error?: string;
  exitCode: number;
}

// Language mapping from Monaco to Piston
const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'c++',
  c: 'c',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  r: 'r',
  perl: 'perl',
  lua: 'lua',
  bash: 'bash',
  sql: 'sql',
};

export async function executeCode(
  language: string,
  code: string,
  stdin?: string
): Promise<ExecutionResult> {
  try {
    const pistonLanguage = LANGUAGE_MAP[language.toLowerCase()] || language;
    
    const response = await axios.post(`${PISTON_API}/execute`, {
      language: pistonLanguage,
      version: '*', // Use latest version
      files: [
        {
          name: `main.${getFileExtension(language)}`,
          content: code,
        },
      ],
      stdin: stdin || '',
    });

    const result = response.data;
    
    let output = '';
    if (result.run?.stdout) {
      output += result.run.stdout;
    }
    
    let error = '';
    if (result.run?.stderr) {
      error = result.run.stderr;
    }
    if (result.compile?.stderr) {
      error = result.compile.stderr + '\n' + error;
    }

    return {
      output: output || (error ? '' : 'Code executed successfully (no output)'),
      error: error || undefined,
      exitCode: result.run?.code || 0,
    };
  } catch (error: any) {
    console.error('Code execution error:', error);
    return {
      output: '',
      error: error.response?.data?.message || error.message || 'Execution failed',
      exitCode: 1,
    };
  }
}

function getFileExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    scala: 'scala',
    r: 'r',
    perl: 'pl',
    lua: 'lua',
    bash: 'sh',
    sql: 'sql',
  };
  return extensions[language.toLowerCase()] || 'txt';
}

export async function getAvailableLanguages() {
  try {
    const response = await axios.get(`${PISTON_API}/runtimes`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch languages:', error);
    return [];
  }
}

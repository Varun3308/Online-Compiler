import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const codeTemplates = {
  cpp: `// C++
#include <iostream>
using namespace std;
int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << "The sum is: " << a + b << endl;
    } else {
        cout << "Hello C++!" << endl;
    }
    return 0;
}`,
  c: `// C
#include <stdio.h>
int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("The sum is: %d", a + b);
    } else {
        printf("Hello C!");
    }
    return 0;
}`,
  py: `# Python
import sys
try:
    lines = sys.stdin.read().split()
    if len(lines) >= 2:
        print(f"The sum is: {int(lines[0]) + int(lines[1])}")
    else:
        print("Hello Python!")
except Exception:
    print("Hello Python!")`,
  java: `// Java
import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int a = scanner.nextInt();
            if (scanner.hasNextInt()) {
                int b = scanner.nextInt();
                System.out.println("The sum is: " + (a + b));
                return;
            }
        }
        System.out.println("Hello Java!");
    }
}`,
  js: `// JavaScript (Node.js)
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2 && input[0]) {
  const num1 = parseInt(input[0]);
  const num2 = parseInt(input[1]);
  console.log("The sum is: " + (num1 + num2));
} else {
  console.log("Hello JavaScript!");
}`
};

const inputTemplates = {
  cpp: `10 20`,
  c: `10 20`,
  py: `10 20`,
  java: `10 20`,
  js: `10 20`,
};

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(codeTemplates['cpp']);
  const [input, setInput] = useState(inputTemplates['cpp']);
  const [output, setOutput] = useState('');
  const [aiReview, setAiReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('output'); // 'output' or 'ai'
  const editorRef = useRef(null);

  useEffect(() => {
    setCode(codeTemplates[language]);
    setInput(inputTemplates[language]);
    setOutput('');
    setAiReview('');
    setActiveTab('output');
  }, [language]);

  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    // Bind Cmd+Enter to run code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });
  };

  const monacoLanguageMap = (lang) => {
    const map = { cpp: "cpp", c: "c", py: "python", java: "java", js: "javascript" };
    return map[lang] || "plaintext";
  };

  const handleRun = async () => {
    setLoading(true);
    setActiveTab('output');
    setOutput('🚀 Sending to queue...');
    
    try {
      const runUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/run';
      const { data } = await axios.post(runUrl, { language, code, input });
      
      const jobId = data.jobId;

      let pollInterval = setInterval(async () => {
          try {
              const statusUrl = `http://localhost:8000/status/${jobId}`;
              const { data: statusData } = await axios.get(statusUrl);
              const jobStatus = statusData.job.status;
              
              if (jobStatus === "success" || jobStatus === "error") {
                  clearInterval(pollInterval);
                  if (jobStatus === "success") {
                    setOutput(statusData.job.output);
                  } else {
                    // Try to parse the error if it's JSON from our worker
                    try {
                        const errorObj = JSON.parse(statusData.job.output);
                        setOutput(`Error: ${errorObj.error?.stderr || errorObj.error?.message || statusData.job.output}`);
                    } catch(e) {
                        setOutput(`Error: ${statusData.job.output}`);
                    }
                  }
                  setLoading(false);
              } else {
                  setOutput('⚙️ Compiling in background worker...');
              }
          } catch (pollError) {
              clearInterval(pollInterval);
              setOutput('❌ Error fetching status: ' + pollError.message);
              setLoading(false);
          }
      }, 500); // Faster polling for snappier UI
      
    } catch (error) {
      setOutput('❌ Failed to submit job: ' + error.message);
      setLoading(false);
    }
  };

  const handleAiReview = async () => {
    setAiLoading(true);
    setActiveTab('ai');
    setAiReview('🤖 AI is reading your code...');
    
    try {
      const reviewUrl = import.meta.env.VITE_GOOGLE_GEMINI_API_URL || 'http://localhost:8000/ai-review';
      const { data } = await axios.post(reviewUrl, { code });
      setAiReview(data.review || data.output || "AI Review Complete");
    } catch (error) {
      setAiReview('❌ Error in AI review: ' + (error.response?.data?.error || error.message));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      
      {/* Premium Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-lg tracking-tighter">
              &lt;/&gt;
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]">
              Online IDE Pro
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Powered by Docker & BullMQ
            </p>
          </div>
        </div>

        <div className="relative group">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none bg-slate-800 border border-slate-700 hover:border-indigo-500 text-slate-200 text-sm font-medium rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer shadow-inner"
          >
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="py">Python 3</option>
            <option value="java">Java (JDK)</option>
            <option value="js">Node.js</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Side: Code Editor */}
        <div className="flex-1 flex flex-col relative border-r border-slate-800 bg-[#1e1e1e]">
          <div className="h-12 bg-slate-900 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700/50 shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
                System Ready
              </span>
              <span className="opacity-80">
                main.{monacoLanguageMap(language) === "python" ? "py" : monacoLanguageMap(language) === "javascript" ? "js" : monacoLanguageMap(language)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAiReview}
                disabled={aiLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold text-fuchsia-400 hover:bg-fuchsia-500/10 hover:text-fuchsia-300 transition-colors disabled:opacity-50"
              >
                {aiLoading ? "Thinking..." : "✨ AI Code Review"}
              </button>
              <button
                onClick={handleRun}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-1.5 rounded-md text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Run Code
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <Editor
              height="100%"
              language={monacoLanguageMap(language)}
              value={code}
              theme="vs-dark"
              onChange={(value) => setCode(value ?? "")}
              onMount={handleEditorMount}
              options={{
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                fontSize: 15,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 20, bottom: 20 },
                cursorBlinking: "smooth",
                smoothScrolling: true,
                formatOnPaste: true,
              }}
            />
          </div>
        </div>

        {/* Right Side: Input & Output Panels */}
        <div className="w-full lg:w-[450px] flex flex-col bg-slate-900 z-10 shrink-0 shadow-2xl">
          
          {/* Input Panel (Top half) */}
          <div className="h-48 shrink-0 flex flex-col border-b border-slate-800">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 backdrop-blur-sm shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Input (Stdin)
              </span>
              <button onClick={() => setInput("")} className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors">
                Clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 w-full p-4 bg-transparent text-slate-300 font-mono text-sm resize-none focus:outline-none focus:bg-slate-800/30 transition-colors selection:bg-indigo-500/40"
              placeholder="Enter your input values here..."
              spellCheck="false"
            />
          </div>

          {/* Output / AI Panel (Bottom half) */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117]">
            {/* Tabs */}
            <div className="flex bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 shadow-sm shrink-0">
              <button
                onClick={() => setActiveTab('output')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'output' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Output console
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'ai' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500 bg-fuchsia-500/5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                AI Feedback
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-5 overflow-auto custom-scrollbar">
              {activeTab === 'output' ? (
                <pre className={`font-mono text-[14px] leading-relaxed whitespace-pre-wrap break-words ${
                  output.includes("Error") || output.includes("❌") ? "text-red-400" : output ? "text-emerald-400" : "text-slate-600"
                }`}>
                  {output || (
                    <span className="italic flex flex-col items-center justify-center h-full opacity-50 mt-10 gap-3">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                      Run code to see output...
                    </span>
                  )}
                </pre>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-slate-300 marker:text-indigo-400 prose-a:text-indigo-400 prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700">
                  {aiReview ? (
                    <ReactMarkdown>{aiReview}</ReactMarkdown>
                  ) : (
                    <div className="italic text-slate-600 flex flex-col items-center justify-center opacity-50 mt-10 gap-3 font-mono">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                      Click "AI Code Review" for analysis...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
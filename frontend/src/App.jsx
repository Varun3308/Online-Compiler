import React, { useState } from 'react';
import _Editor from 'react-simple-code-editor';
const Editor = _Editor.default || _Editor;
import ReactMarkdown from 'react-markdown';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism.css';
import axios from 'axios';
import './App.css';

const defaultCodes = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    int num1, num2, sum;
    cin >> num1 >> num2;
    sum = num1 + num2;
    cout << "The sum of the two numbers is: " << sum;
    return 0;
}`,
  c: `#include <stdio.h>

int main() {
    int num1, num2, sum;
    scanf("%d %d", &num1, &num2);
    sum = num1 + num2;
    printf("The sum of the two numbers is: %d", sum);
    return 0;
}`,
  py: `num1 = int(input())
num2 = int(input())
print(f"The sum of the two numbers is: {num1 + num2}")`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int num1 = scanner.nextInt();
        int num2 = scanner.nextInt();
        int sum = num1 + num2;
        System.out.println("The sum of the two numbers is: " + sum);
    }
}`,
  js: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
if (input.length >= 2 && input[0]) {
  const num1 = parseInt(input[0]);
  const num2 = parseInt(input[1]);
  console.log("The sum of the two numbers is: " + (num1 + num2));
} else {
  console.log("Hello JavaScript!");
}`
};

function App() {
  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState(defaultCodes['cpp']);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [aiReview, setAiReview] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isAiReviewLoading, setIsAiReviewLoading] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    const payload = {
      language,
      code,
      input
    };

    try {
      // 1. Send code to backend, get jobId immediately
      const runUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000/run';
      const { data } = await axios.post(runUrl, payload);
      
      const jobId = data.jobId;

      // 2. Start "Polling": Ask the backend every 1 second if the code is done
      let pollInterval = setInterval(async () => {
          try {
              const statusUrl = `http://localhost:8000/status/${jobId}`;
              const { data: statusData } = await axios.get(statusUrl);
              const jobStatus = statusData.job.status;
              
              if (jobStatus === "success" || jobStatus === "error") {
                  // 3. If done, stop asking (clearInterval) and show the output!
                  clearInterval(pollInterval);
                  setOutput(statusData.job.output);
                  setIsRunning(false);
              } else {
                  setOutput('Execution pending... Checking status...');
              }
          } catch (pollError) {
              clearInterval(pollInterval);
              setOutput('Error fetching status: ' + pollError.message);
              setIsRunning(false);
          }
      }, 1000);
      
    } catch (error) {
      setOutput('Error executing code, error: ' + error.message);
      setIsRunning(false);
    }
  };

  const handleAiReview = async () => {
    setIsAiReviewLoading(true);
    const payload = {
      code
    };

    try {
      const reviewUrl = import.meta.env.VITE_GOOGLE_GEMINI_API_URL || 'http://localhost:8000/ai-review';
      const { data } = await axios.post(reviewUrl, payload);
      setAiReview(data.review);
    } catch (error) {
      setAiReview('Error in AI review, error: ' + error.message);
    } finally {
      setIsAiReviewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 text-center">Online Code Compiler</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Code Editor Section */}
        <div className="bg-white shadow-lg rounded-lg p-4 h-full flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-gray-700">Code Editor</h2>
            <select 
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                setCode(defaultCodes[e.target.value]);
              }}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
            >
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="py">Python</option>
              <option value="java">Java</option>
              <option value="js">JavaScript</option>
            </select>
          </div>
          <div className="bg-gray-100 rounded-lg overflow-y-auto flex-grow" style={{ height: '500px' }}>
            <Editor
              value={code}
              onValueChange={code => setCode(code)}
              highlight={code => highlight(code, languages.js)}
              padding={15}
              style={{
                fontFamily: '"Fira code", "Fira Mono", monospace',
                fontSize: 14,
                minHeight: '500px'
              }}
            />
          </div>
        </div>

        {/* Input, Output, AI Review */}
        <div className="flex flex-col gap-4">
          {/* Input Box */}
          <div className="bg-white shadow-lg rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Input</h2>
            <textarea
              rows="4"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter input values..."
              className="w-full p-3 text-sm border border-gray-300 rounded-md resize-none"
            />
          </div>

          {/* Output Box */}
          <div className="bg-white shadow-lg rounded-lg p-4 overflow-y-auto" style={{ height: '150px' }}>
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Output</h2>
            <div className="text-sm font-mono whitespace-pre-wrap text-gray-800">{output}</div>
          </div>

          {/* AI Review Box */}
          <div className="bg-white shadow-lg rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">AI Review</h2>
            <div className="prose prose-sm text-gray-800 overflow-y-auto" style={{ height: '150px' }}>
              {
                aiReview === '' ?
                  <div>🤖</div> :
                  <ReactMarkdown>
                    {aiReview}
                  </ReactMarkdown>
              }
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {isRunning ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={handleAiReview}
              disabled={isAiReviewLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition"
            >
              {isAiReviewLoading ? 'Reviewing...' : 'AI Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
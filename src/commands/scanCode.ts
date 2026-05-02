import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function scanCodeCommand(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('DevOps AI: Please open a file to scan.');
        return;
    }

    const apiKey = await context.secrets.get('gemini_api_key');
    if (!apiKey) {
        vscode.window.showErrorMessage('DevOps AI: No API key found. Please run "Set Gemini API Key" first.');
        return;
    }

    const document = editor.document;
    const codeText = document.getText();
    const language = document.languageId;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    // The Enterprise-Grade DevSecOps Prompt
    const prompt = `
        You are a Senior Enterprise DevSecOps Engineer and strict vulnerability scanner. 
        Analyze the following ${language} code for security vulnerabilities.
        
        Respond ONLY with a raw JSON array. Do not use markdown formatting.
        - "startLine": The line number where the vulnerable code block begins.
        - "endLine": The line number where the vulnerable code block ends.
        - "issue": A short description of the vulnerability.
        - "fix": Provide ONLY the raw, valid code to replace the lines from startLine to endLine. 
        
        CRITICAL ENGINEERING CONSTRAINTS FOR THE "fix" FIELD:
        1. The fix MUST be production-ready and adhere strictly to OWASP best practices.
        2. It MUST completely eliminate the vulnerability without introducing any new attack vectors.
        3. Use high-level, secure-by-design APIs (e.g., parameterized database queries, safe DOM APIs like textContent, crypto-safe randoms).
        4. Do NOT include explanations, chatty text, or markdown ticks.
        5. Do NOT use inline anonymous functions (IIFEs) for input validation. 
        6. If the secure fix requires replacing the entire function block to use a safer architectural pattern, provide the fully refactored block.
        
        If there are no vulnerabilities, return an empty array: []
        
        Code to analyze:
        ${codeText}
    `;

    try {
        vscode.window.showInformationMessage('DevOps AI: Scanning code with Gemini...');
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Clean the JSON string
        const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const vulnerabilities = JSON.parse(cleanText);

        // Clear any old squiggly lines from previous scans
        diagnosticCollection.clear();
        
        const diagnostics: vscode.Diagnostic[] = [];

        for (const vuln of vulnerabilities) {
            // VS Code lines start at 0
            const startLineNum = (vuln.startLine || vuln.line) - 1; 
            // Fallback to startLine if AI forgets endLine
            const endLineNum = (vuln.endLine || vuln.startLine || vuln.line) - 1; 
            
            if (startLineNum < 0 || endLineNum >= document.lineCount) {continue;}

            // Find how long the last line is to highlight the full block
            const endLineText = document.lineAt(endLineNum).text;
            
            // Create a range spanning from the start line to the end line
            const range = new vscode.Range(startLineNum, 0, endLineNum, endLineText.length);
            
            const hoverMessage = `**Vulnerability:** ${vuln.issue}\n\n**Suggested Fix:**\n${vuln.fix}`;
            
            const diagnostic = new vscode.Diagnostic(
                range, 
                hoverMessage, 
                vscode.DiagnosticSeverity.Warning 
            );
            
            // Tag it for our QuickFixProvider
            diagnostic.source = 'DevOps AI';
            (diagnostic as any).suggestedFix = vuln.fix;
            
            diagnostics.push(diagnostic);
        }

        // Draw the squiggles!
        diagnosticCollection.set(document.uri, diagnostics);
        
        if (vulnerabilities.length > 0) {
            vscode.window.showWarningMessage(`DevOps AI: Found ${vulnerabilities.length} vulnerabilities! Check the highlighted lines.`);
        } else {
            vscode.window.showInformationMessage(`DevOps AI: Code looks secure! No vulnerabilities found.`);
        }

    } catch (error) {
        console.error("Scan error:", error);
        vscode.window.showErrorMessage('DevOps AI: Failed to scan code or parse response. Check Debug Console.');
    }
}
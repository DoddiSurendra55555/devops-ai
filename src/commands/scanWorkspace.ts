import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { findProjectFiles } from '../utils/workspaceScanner';

export async function scanWorkspaceCommand(context: vscode.ExtensionContext, diagnosticCollection: vscode.DiagnosticCollection) {
    const apiKey = await context.secrets.get('gemini_api_key');
    if (!apiKey) {
        vscode.window.showErrorMessage('DevOps AI: API Key not found. Please set it first.');
        return;
    }

    const files = await findProjectFiles();
    if (files.length === 0) {
        vscode.window.showInformationMessage('DevOps AI: No relevant source files found to scan.');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Show a Progress Bar in the bottom right corner
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "DevOps AI: Full Workspace Audit",
        cancellable: true
    }, async (progress, token) => {
        
        let totalVulns = 0;
        diagnosticCollection.clear(); // Clear old warnings

        for (let i = 0; i < files.length; i++) {
            // Allow the user to cancel the long scan
            if (token.isCancellationRequested) {return;}

            const fileUri = files[i];
            const document = await vscode.workspace.openTextDocument(fileUri);
            const codeText = document.getText();
            const relativePath = vscode.workspace.asRelativePath(fileUri);

            // Update the UI Progress Bar
            progress.report({ 
                increment: (100 / files.length), 
                message: `Auditing ${relativePath}...` 
            });

            // Re-use our strict enterprise prompt
            const prompt = `
                You are a Senior Enterprise DevSecOps Engineer. Analyze this ${document.languageId} code for vulnerabilities.
                Respond ONLY with a raw JSON array. Do not use markdown formatting.
                - "startLine": The line number where the vulnerable code block begins.
                - "endLine": The line number where the vulnerable code block ends.
                - "issue": A short description of the vulnerability.
                - "fix": Provide ONLY the raw, valid code to replace the lines.
                If there are no vulnerabilities, return an empty array: []
                Code:
                ${codeText}
            `;

            try {
                const result = await model.generateContent(prompt);
                const cleanText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                const vulnerabilities = JSON.parse(cleanText);

                if (vulnerabilities.length > 0) {
                    totalVulns += vulnerabilities.length;
                    const diagnostics: vscode.Diagnostic[] = [];

                    for (const vuln of vulnerabilities) {
                        const startLineNum = (vuln.startLine || vuln.line) - 1;
                        const endLineNum = (vuln.endLine || vuln.startLine || vuln.line) - 1;
                        
                        if (startLineNum < 0 || endLineNum >= document.lineCount) {continue;}

                        const endLineText = document.lineAt(endLineNum).text;
                        const range = new vscode.Range(startLineNum, 0, endLineNum, endLineText.length);
                        
                        const diag = new vscode.Diagnostic(
                            range, 
                            `[AI Audit] ${vuln.issue}`, 
                            vscode.DiagnosticSeverity.Warning
                        );
                        diag.source = 'DevOps AI';
                        (diag as any).suggestedFix = vuln.fix;
                        diagnostics.push(diag);
                    }
                    // Apply warnings to the specific file
                    diagnosticCollection.set(fileUri, diagnostics);
                }

                // Add a small delay (300ms) to prevent hitting Gemini API rate limits
                await new Promise(resolve => setTimeout(resolve, 300));

            } catch (e) {
                console.error(`Failed to scan ${relativePath}:`, e);
            }
        }

        if (totalVulns > 0) {
            vscode.window.showWarningMessage(`Audit Complete: Found ${totalVulns} issues. Check the 'Problems' tab!`);
        } else {
            vscode.window.showInformationMessage('Audit Complete: Project looks secure!');
        }
    });
}
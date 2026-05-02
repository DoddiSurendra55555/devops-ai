import * as vscode from 'vscode';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DevOpsAIDiffProvider } from '../utils/diffProvider';

export async function secureFileCommand(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('DevOps AI: Please open a file to secure.');
        return;
    }

    const apiKey = await context.secrets.get('gemini_api_key');
    if (!apiKey) {
        vscode.window.showErrorMessage('DevOps AI: API Key not found.');
        return;
    }

    const document = editor.document;
    const originalText = document.getText();
    const language = document.languageId;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
        You are a Senior Enterprise DevSecOps Architect.
        The following ${language} file contains security vulnerabilities. 
        
        Rewrite the ENTIRE file to be 100% secure.
        
        CRITICAL CONSTRAINTS:
        1. Fix ALL vulnerabilities.
        2. DO NOT change the core business logic or the names of the functions/variables.
        3. Use high-level, production-ready, secure-by-design patterns.
        4. Return ONLY the raw, perfectly formatted code for the entire file. 
        5. Do NOT use markdown formatting (like \`\`\`javascript). Do NOT add explanations.
        
        Code to secure:
        \n${originalText}
    `;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "DevOps AI: Architecting secure file rewrite...",
        cancellable: false
    }, async () => {
        try {
            const result = await model.generateContent(prompt);
            const secureCode = result.response.text().replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

            // Safely create the Virtual URI using VS Code's built-in .with() method
            const virtualUri = document.uri.with({ 
                scheme: 'devopsai-preview', 
                path: document.uri.path + '-holistic' 
            });
            
            DevOpsAIDiffProvider.fixedCodeMap.set(virtualUri.path, secureCode);

            await vscode.commands.executeCommand(
                'vscode.diff',
                document.uri, 
                virtualUri,  
                `Review Full File Security Rewrite` 
            );

            // Tell the user what to do, without blocking the UI
            vscode.window.showInformationMessage('Review the changes at your own pace. Click the ✔️ icon in the top right corner when you are ready to accept.');

        } catch (e: any) {
            // This will print the EXACT reason it failed to your Debug Console
            console.error("Rewrite Error Details:", e);
            vscode.window.showErrorMessage(`DevOps AI: Failed to rewrite file. Check Debug Console.`);
        }
    });
}
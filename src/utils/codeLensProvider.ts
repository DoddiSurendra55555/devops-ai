import * as vscode from 'vscode';

export class DevOpsAICodeLensProvider implements vscode.CodeLensProvider {
    
    // This function tells VS Code where to draw the floating buttons
    provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] {
        
        // Only show these buttons in our custom AI preview window!
        if (document.uri.scheme !== 'devopsai-preview') {
            return [];
        }

        // We want the buttons to hover directly above Line 1 of the code
        const topOfDocument = new vscode.Range(0, 0, 0, 0);

        // Button 1: Accept the Fix
        const acceptLens = new vscode.CodeLens(topOfDocument, {
            title: "$(check) Accept AI Fix",
            command: "devopsai.applyDiff",
            arguments: [document.uri] // Pass the file URI so the command knows what to save
        });

        // Button 2: Reject and Close
        const cancelLens = new vscode.CodeLens(topOfDocument, {
            title: "$(close) Cancel & Close",
            command: "workbench.action.closeActiveEditor" // VS Code's native close tab command
        });

        return [acceptLens, cancelLens];
    }
}
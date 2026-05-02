import * as vscode from 'vscode';

export class DevOpsAIDiffProvider implements vscode.TextDocumentContentProvider {
    // This Map acts as our temporary memory to store the fixed code
    public static fixedCodeMap = new Map<string, string>();

    // VS Code calls this function automatically when we open the Diff view
    provideTextDocumentContent(uri: vscode.Uri): string {
        // We look up the fixed code using the file path as the key
        return DevOpsAIDiffProvider.fixedCodeMap.get(uri.path) || 'Error: Could not load fix preview.';
    }
}
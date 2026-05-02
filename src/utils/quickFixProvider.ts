import * as vscode from 'vscode';

export class DevOpsAIQuickFixProvider implements vscode.CodeActionProvider {
    
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'DevOps AI' && (diagnostic as any).suggestedFix) {
                const fixText = (diagnostic as any).suggestedFix;
                
                // Change the text so the user knows it's safe to click
                const action = new vscode.CodeAction('Review AI Fix (Preview)', vscode.CodeActionKind.QuickFix);
                
                // INSTEAD of a WorkspaceEdit, we trigger our new Review command
                action.command = {
                    command: 'devopsai.reviewFix',
                    title: 'Review AI Fix',
                    arguments: [document.uri, diagnostic.range, fixText] // Pass the data to the command
                };
                
                action.isPreferred = true;
                actions.push(action);
            }
        }
        return actions;
    }
}
import * as vscode from 'vscode';
import { DevOpsAIDiffProvider } from '../utils/diffProvider';

export async function applyDiffCommand(uri?: vscode.Uri) {
    // When clicked from the top-right button, VS Code hands us the URI of the active view
    const virtualUri = uri || vscode.window.activeTextEditor?.document.uri;

    if (!virtualUri || virtualUri.scheme !== 'devopsai-preview') {
        vscode.window.showErrorMessage('DevOps AI: No active AI preview found.');
        return;
    }

    // Grab the AI's fixed code from our memory map
    const secureCode = DevOpsAIDiffProvider.fixedCodeMap.get(virtualUri.path);
    if (!secureCode) {
        vscode.window.showErrorMessage('DevOps AI: Code not found in memory.');
        return;
    }

    // Safely reconstruct the original file path
    const originalUri = virtualUri.with({
        scheme: 'file',
        path: virtualUri.path.replace('-holistic', '').replace('-fixed', '')
    });

    const document = await vscode.workspace.openTextDocument(originalUri);
    const edit = new vscode.WorkspaceEdit();

    // Select the entire original document
    const lastLineIndex = document.lineCount > 0 ? document.lineCount - 1 : 0;
    const lastLineLength = document.lineCount > 0 ? document.lineAt(lastLineIndex).text.length : 0;
    const fullRange = new vscode.Range(0, 0, lastLineIndex, lastLineLength);

    // Overwrite it with the AI's secure code
    edit.replace(originalUri, fullRange, secureCode);
    await vscode.workspace.applyEdit(edit);
    await document.save();

    vscode.window.showInformationMessage('DevOps AI: Fix securely applied!');
    vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    vscode.commands.executeCommand('devopsai.scanCurrentFile'); // Re-scan to clear warnings
}
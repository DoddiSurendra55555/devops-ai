import * as vscode from 'vscode';
import { DevOpsAIDiffProvider } from '../utils/diffProvider';

export async function reviewFixCommand(documentUri: vscode.Uri, range: vscode.Range, fixText: string) {
    
    // 1. Scrub the AI's text just in case it snuck markdown inside the JSON value
    const cleanFixText = fixText.replace(/```[a-z]*\n?/g, '').replace(/```/g, '').trim();

    const document = await vscode.workspace.openTextDocument(documentUri);
    const originalText = document.getText();

    const startOffset = document.offsetAt(range.start);
    const endOffset = document.offsetAt(range.end);
    
    // Use the scrubbed text for the preview
    const fixedFullText = originalText.substring(0, startOffset) + cleanFixText + originalText.substring(endOffset);

    const virtualUriPath = documentUri.path + '-fixed';
    DevOpsAIDiffProvider.fixedCodeMap.set(virtualUriPath, fixedFullText);

    const virtualUri = vscode.Uri.parse(`devopsai-preview:${virtualUriPath}`);

    await vscode.commands.executeCommand(
        'vscode.diff',
        documentUri, 
        virtualUri,  
        `Review AI Fix: ${document.fileName}` 
    );

    const userChoice = await vscode.window.showInformationMessage(
        'Review the AI fix in the diff editor. Do you want to apply this to your code?',
        'Accept & Apply Fix',
        'Cancel'
    );

    if (userChoice === 'Accept & Apply Fix') {
        const edit = new vscode.WorkspaceEdit();
        // Paste the scrubbed text into the real file
        edit.replace(documentUri, range, cleanFixText);
        await vscode.workspace.applyEdit(edit);
        
        // Auto-save the file so the changes lock in
        await document.save();

        vscode.window.showInformationMessage('DevOps AI: Fix applied successfully!');
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        // ULTIMATE UX FIX: Automatically run a fresh scan on this file to clear the old ghost squiggles!
        vscode.commands.executeCommand('devopsai.scanCurrentFile');
        
    } else {
        vscode.window.showInformationMessage('DevOps AI: Fix rejected. No changes made.');
        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }
}
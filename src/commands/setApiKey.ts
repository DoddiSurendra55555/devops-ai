import * as vscode from 'vscode';

export async function setApiKeyCommand(context: vscode.ExtensionContext) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your Gemini API Key to enable the vulnerability scanner',
        password: true, 
        ignoreFocusOut: true 
    });

    if (apiKey) {
        await context.secrets.store('gemini_api_key', apiKey);
        vscode.window.showInformationMessage('DevOps AI: Gemini API Key saved securely!');
    } else {
        vscode.window.showWarningMessage('DevOps AI: API Key setup cancelled.');
    }
}
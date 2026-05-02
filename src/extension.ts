import * as vscode from 'vscode';
import { setApiKeyCommand } from './commands/setApiKey';
import { scanCodeCommand } from './commands/scanCode';
import { scanWorkspaceCommand } from './commands/scanWorkspace';
import { reviewFixCommand } from './commands/reviewFix';
import { secureFileCommand } from './commands/secureFile';
import { applyDiffCommand } from './commands/applyDiff';
import { DevOpsAIQuickFixProvider } from './utils/quickFixProvider';
import { DevOpsAIDiffProvider } from './utils/diffProvider';
import { DevOpsAICodeLensProvider } from './utils/codeLensProvider'; // NEW: The CodeLens Provider

export function activate(context: vscode.ExtensionContext) {
    // 1. Diagnostic Collection (Yellow squiggly lines)
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('devops-ai');
    context.subscriptions.push(diagnosticCollection);

    // 2. Virtual Document Provider (Diff Preview window)
    const diffProvider = new DevOpsAIDiffProvider();
    context.subscriptions.push(
        vscode.workspace.registerTextDocumentContentProvider('devopsai-preview', diffProvider)
    );

    // 3. Register All Commands
    let setKeyCmd = vscode.commands.registerCommand('devopsai.setApiKey', () => {
        setApiKeyCommand(context);
    });

    let scanCmd = vscode.commands.registerCommand('devopsai.scanCurrentFile', () => {
        scanCodeCommand(context, diagnosticCollection);
    });

    let scanWorkspaceCmd = vscode.commands.registerCommand('devopsai.scanWorkspace', () => {
        scanWorkspaceCommand(context, diagnosticCollection);
    });

    let reviewCmd = vscode.commands.registerCommand('devopsai.reviewFix', reviewFixCommand);

    let secureFileCmd = vscode.commands.registerCommand('devopsai.secureEntireFile', () => {
        secureFileCommand(context);
    });

    let applyCmd = vscode.commands.registerCommand('devopsai.applyDiff', applyDiffCommand);

    // 4. Register the Quick Fix Provider (Blue lightbulb)
    const quickFixProvider = vscode.languages.registerCodeActionsProvider(
        { scheme: 'file' }, 
        new DevOpsAIQuickFixProvider(),
        { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    );

    // 5. Register the CodeLens Provider (Floating buttons inside the Diff view)
    const codeLensProvider = vscode.languages.registerCodeLensProvider(
        { scheme: 'devopsai-preview' }, 
        new DevOpsAICodeLensProvider()
    );

    // 6. Add EVERYTHING to subscriptions so VS Code keeps it running
    context.subscriptions.push(
        setKeyCmd, 
        scanCmd, 
        scanWorkspaceCmd, 
        reviewCmd, 
        secureFileCmd,
        applyCmd,
        quickFixProvider,
        codeLensProvider // NEW: Added to subscriptions
    );
}

export function deactivate() {}
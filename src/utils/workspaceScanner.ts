import * as vscode from 'vscode';

export async function findProjectFiles(): Promise<vscode.Uri[]> {
    // We only want to scan code files
    const includePattern = '**/*.{js,ts,py,html,java,cpp,go,rs}';
    
    // We MUST ignore heavy folders and compiled code
    const excludePattern = '{**/node_modules/**,**/dist/**,**/out/**,**/build/**,**/.git/**}';

    // Find all files matching the pattern
    const files = await vscode.workspace.findFiles(includePattern, excludePattern);
    return files;
}
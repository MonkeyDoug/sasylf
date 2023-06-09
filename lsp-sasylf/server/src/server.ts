/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 * ------------------------------------------------------------------------------------------
 */
import { spawnSync } from "child_process";
import { TextDocument } from "vscode-languageserver-textdocument";
import { EOL } from "os";
import {
    CompletionItem,
    CompletionItemKind,
    createConnection,
    Diagnostic,
    DiagnosticSeverity,
    DidChangeConfigurationNotification,
    InitializeParams,
    InitializeResult,
    ProposedFeatures,
    TextDocumentPositionParams,
    TextDocuments,
    TextDocumentSyncKind,
    TextEdit,
} from "vscode-languageserver/node";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            codeActionProvider: { resolveProvider: true },
            completionProvider: { resolveProvider: true },
            definitionProvider: true,
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: { supported: true },
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log("Workspace folder change event received.");
        });
    }
});

// The example settings
interface ExampleSettings {
    maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not
// supported by the client. Please note that this is not the case when using
// this server with the client provided in this example but could happen with
// other clients.
const defaultSettings: ExampleSettings = {
    maxNumberOfProblems: 1000,
};
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = <ExampleSettings>(
            (change.settings.languageServerExample || defaultSettings)
        );
    }

    // Revalidate all open text documents
    documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: "languageServerExample",
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
});

// Map that contains diagnostics encoded with line numbers and error message and
// their corresponding quickfixes
const quickfixes: Map<string | number | undefined, any> = new Map();

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

// Gives diagonistics based on output of sasylf cli
async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // Parses json output from sasylf core and turns them into corresponding
    // diagnostics and quickfixes
    const settings = await getDocumentSettings(textDocument.uri);

    const diagnostics: Diagnostic[] = [];
    const text = textDocument.getText();
    const text_lines = text.split(/\r?\n/);
    const command = spawnSync("sasylf", ["--lsp", "--stdin"], { input: text });

    // console.log(command.stdout.toString());
    const output = JSON.parse(command.stdout.toString());

    quickfixes.clear();
    for (
        let i = 0;
        i < output.length && i < settings.maxNumberOfProblems - 1;
        ++i
    ) {
        const element = output[i];
        const severity = element["Severity"];
        if (severity == "info") continue;
        // if (element['Begin Line'] !== element['End Line']) throw new Error("Begin and end lines do not match, error must be on the same line");
        // const line = element['Begin Line'] - 1;
        const start = {
            line: element["Begin Line"] - 1,
            character: element["Begin Column"] - 1,
        };
        const end = {
            line: element["End Line"] - 1,
            character: element["End Column"] - 1,
        };
        const message = element["Error Message"];
        const range = { start: start, end: end };
        if (severity == "error") {
            quickfixes.set(i, {
                error_type: element["Error Type"],
                error_info: element["Error Info"],
                range: range,
            });
        }
        const diagnostic: Diagnostic = {
            severity:
                severity == "warning"
                    ? DiagnosticSeverity.Warning
                    : DiagnosticSeverity.Error,
            range: range,
            message: message,
            source: "sasylf",
            code: i,
        };
        diagnostics.push(diagnostic);
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((change) => {
    // Monitored files have change in VSCode
    connection.console.log("We received an file change event");
});

// Implements go to definnition
connection.onDefinition((params) => {
    const doc = documents.get(params.textDocument.uri);

    if (doc == null) return undefined;

    const badCharacters: String[] = [
        " ",
        "\t",
        "\n",
        "\r",
        "\f",
        "\v",
        "(",
        ")",
    ];
    const text = doc.getText();
    const lines = text.split("\n");
    const offset = doc.offsetAt(params.position);
    let wordStart = offset;
    let wordEnd = offset;

    // Finds the word underneath the cursor
    while (
        !badCharacters.includes(text[wordStart]) ||
        !badCharacters.includes(text[wordEnd])
    ) {
        if (!badCharacters.includes(text[wordStart])) --wordStart;
        if (!badCharacters.includes(text[wordEnd])) ++wordEnd;
    }

    const word = text.slice(wordStart + 1, wordEnd);

    // Checks if it is a terminal
    // let terminals: string[] = [];
    // let termLine = -1;

    // for (let i = 0; i < lines.length; ++i) {
    //     if (lines[i].startsWith("terminals")) {
    //         const terms = lines[i].slice(9);
    //         terminals = terms.split(/\s+/).filter((term) => term !== "");
    //         termLine = i;
    //         break;
    //     }
    // }

    // if (terminals.includes(word))
    //     return {
    //         uri: params.textDocument.uri,
    //         range: {
    //             start: {
    //                 line: termLine,
    //                 character: lines[termLine].slice(9).indexOf(word) + 9,
    //             },
    //             end: {
    //                 line: termLine,
    //                 character:
    //                     lines[termLine].slice(9).indexOf(word) +
    //                     word.length +
    //                     9,
    //             },
    //         },
    //     };

    // Checks for syntaxes
    // const noCommentText = text
    //     .replace(/\/\/.*/g, "")
    //     .replace(/\/\*[\s\S]*?\*\//g, "");
    // const syntaxInd = noCommentText.indexOf("syntax");
    // const judgementInd = noCommentText.indexOf("judgment");
    // const syntaxText = noCommentText
    //     .substring(syntaxInd, judgementInd)
    //     .slice(6);
    // const symbols = Array.from(
    //     new Set(
    //         syntaxText
    //             .split(/\s+/)
    //             .filter(
    //                 (symbol) =>
    //                     !["", "::=", ":=", "|"].includes(symbol) &&
    //                     !terminals.includes(symbol)
    //             )
    //     )
    // );
    // const escapedSymbols = symbols.map((symbol) =>
    //     symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // );

    // const addendRegex = new RegExp(`(${escapedSymbols.join("|")})('|\d)*`);
    // const addendMatch = addendRegex.exec(word);

    // if (addendMatch) {
    //     const root = addendMatch[1];

    //     const symbolPattern = `(${escapedSymbols.join("|")})`;
    //     const symbolRegex = new RegExp(symbolPattern, "g");
    //     const badRegex = /\/\/.*|\/\*[\s\S]*?\*\/|terminals|syntax/g;

    //     const symbolMatches: number[] = [];
    //     let symbolMatch: RegExpExecArray | null;

    //     while ((symbolMatch = symbolRegex.exec(text)) !== null) {
    //         symbolMatches.push(
    //             symbolMatch.index + symbolMatch[0].indexOf(symbolMatch[1])
    //         );
    //     }

    //     const commentIndices: number[] = [];
    //     let commentMatch: RegExpExecArray | null;

    //     while ((commentMatch = badRegex.exec(text)) !== null) {
    //         const startIndex = commentMatch.index;
    //         const endIndex = startIndex + commentMatch[0].length;

    //         for (let i = startIndex; i < endIndex; ++i) {
    //             commentIndices.push(i);
    //         }
    //     }

    //     const desiredIndices = symbolMatches.filter(
    //         (index) => !commentIndices.includes(index)
    //     );

    //     const regex = new RegExp(root, "g");
    //     const syntaxEndInd = text.indexOf("syntax") + 5;

    //     let match: RegExpExecArray | null;
    //     let index = 0;

    //     while ((match = regex.exec(text)) !== null) {
    //         if (
    //             desiredIndices.includes(match.index) &&
    //             match.index > syntaxEndInd
    //         ) {
    //             index = match.index;
    //             break;
    //         }
    //     }

    //     return {
    //         uri: params.textDocument.uri,
    //         range: {
    //             start: doc.positionAt(index),
    //             end: doc.positionAt(index + root.length),
    //         },
    //     };
    // }

    // Checks for judgements
    // const judgmentIndices = lines.reduce((indices: number[], line, index) => {
    //     if (line.startsWith("judgment")) {
    //         indices.push(index);
    //     }

    //     return indices;
    // }, []);

    // Checks if it is a rule, theorem, or lemma
    const words = lines[params.position.line].split(/\s+/);
    const ind = words.indexOf(word);
    let formula = "";

    if (ind < 2) return undefined;
    else if (words[ind - 2] == "by") formula = words[ind - 1];

    let regexPattern: string;

    // Creates the regex depending on whether it is a rule or not
    if (formula == "rule") {
        regexPattern = `\\s*(--{3,}|—{3,}|―{3,}|─{3,})\\s*${word}\\s*`;
    } else if (formula == "theorem" || formula == "lemma") {
        regexPattern = `\\s*${formula}\\s+${word}.*`;
    } else {
        return undefined;
    }

    const regex = new RegExp(regexPattern);
    let line = -1;

    for (let i = 0; i < lines.length; ++i) {
        if (regex.test(lines[i])) {
            line = i;
            break;
        }
    }

    if (line == -1) return undefined;

    return {
        uri: params.textDocument.uri,
        range: {
            start: { line: line, character: lines[line].indexOf(word) },
            end: {
                line: line,
                character: lines[line].indexOf(word) + word.length,
            },
        },
    };
});

// Looks for quickfixes in the `quickfixes` map and returns them if they exist
connection.onCodeAction(async (params) => {
    const textDocument: TextDocument | undefined = documents.get(
        params.textDocument.uri
    );

    if (textDocument == null) return;

    const codeActions = [];

    const eolSetting = await connection.workspace.getConfiguration({
        section: "files",
    });
    const nl = eolSetting.eol == "auto" ? EOL : eolSetting.eol;

    // For each diagnostic, try to find a quick fix
    for (const diagnostic of params.context.diagnostics) {
        const code: string | number | undefined = diagnostic.code;
        if (code == null) continue;
        if (!quickfixes.has(code)) continue;
        const quickfix = quickfixes.get(code);
        const error_type = quickfix.error_type;
        if (error_type != "error") continue;
        const error_info = quickfix.error_info;
        const range = quickfix.range;
        const line = range.start.line;
        if (line === 0) continue;
        const lineInfo = textDocument.getText(range);
        const lineText = textDocument.getText(range);
        const split = error_info.split(/\r?\n/, -1);
        let newText;
        switch (error_type) {
            default:
                continue;
            case "MISSING_CASE":
                continue;
        }
    }

    return [];
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

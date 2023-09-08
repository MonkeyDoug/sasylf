import { TextDocument } from "vscode-languageserver-textdocument";
import { Range, Location } from "vscode-languageserver/node";
import { ast, ruleNode, moduleNode, theoremNode } from "./types";
import * as path from "path";
import { tmpdir } from "os";
import { mkdir, writeFile } from "fs";
import { URI } from "vscode-uri";

function createTemporaryFile(
    file_path: string,
    content: string,
): string | null {
    const tmp_path = path.join(tmpdir(), file_path);
    mkdir(path.dirname(tmp_path), { recursive: true }, (err) => {
        if (err) return null;
        else {
            writeFile(tmp_path, content, (err) => {
                if (err) return null;
            });
        }
    });
    return tmp_path;
}

export function search(
    input: string,
    ast: ast,
    root_uri: string,
): Location | undefined {
    let root_path: string = root_uri.substring(7);
    let result: Range | null;
    const input_parts = input.split(".");
    if (input_parts.length != 2) return undefined;
    const [input_module_name, name] = input_parts;
    for (const module of ast.modules) {
        const module_name_parts = module.name.split(": ");
        if (module_name_parts.length != 2) return undefined;
        const [module_name, module_path] = module_name_parts;
        let file_path = module_path.split(".");
        file_path[file_path.length - 1] += ".slf";
        const formatted_file_path = path.join(...file_path);
        let formatted_path = path.join(
            path.dirname(root_path),
            formatted_file_path,
        );

        if (module_name == input_module_name) {
            result = searchNode(name, module.ast.theorems);
            if (result != null) {
                if ("text" in module && module.text != null) {
                    let file_result = createTemporaryFile(
                        formatted_file_path,
                        module.text,
                    );
                    if (file_result == null) return undefined;
                    else formatted_path = file_result;
                }
                return {
                    uri: URI.from({
                        scheme: "temporary",
                        path: formatted_path,
                    }).toString(),
                    range: result,
                };
            }
            result = searchNode(
                name,
                module.ast.judgments.map((judgment) => judgment.rules).flat(),
            );
            if (result != null) {
                if ("text" in module && module.text != null) {
                    let file_result = createTemporaryFile(
                        formatted_file_path,
                        module.text,
                    );
                    if (file_result == null) return undefined;
                    else formatted_path = file_result;
                }
                return {
                    uri: URI.from({
                        scheme: "temporary",
                        path: formatted_path,
                    }).toString(),
                    range: result,
                };
            }
        }
    }
    return undefined;
}

export function searchNode(
    name: string,
    node_list: theoremNode[] | ruleNode[],
): Range | null {
    for (const node of node_list) {
        if (name === node.name) {
            return {
                start: { line: node.line - 1, character: node.column - 1 },
                end: { line: node.line - 1, character: node.column - 1 },
            };
        }
    }
    return null;
}

// Returns a range corresponding to line and char passed in
// If only start_line is passed in, we get entire line
// end_line defaults to start_line
// start_char defaults to -1 (first character)
// end_char defaults to start_char if it is not -1, and Number.MAX_VALUE (last character) otherwise
export function getLineRange(
    start_line: number,
    end_line: number | null = null,
    start_char: number | null = null,
    end_char: number | null = null,
): Range {
    if (end_line == null) end_line = start_line;
    if (start_char == null) start_char = -1;
    if (end_char == null) {
        end_char = start_char == -1 ? Number.MAX_VALUE : start_char;
    }
    return {
        start: { line: start_line, character: start_char },
        end: { line: end_line, character: end_char },
    };
}

// Gets range based off offset and length passed, essentially gets the range of textDocument.substring(offset, length)
export function getLineRangeFromOffset(
    offset: number,
    length: number,
    textDocument: TextDocument,
) {
    return {
        start: textDocument.positionAt(offset),
        end: textDocument.positionAt(offset + length),
    };
}

// Checks if a character is the bar char
export function isBarChar(ch: string): boolean {
    return ch === "-" || ch === "\u2500" || ch === "\u2014" || ch === "\u2015";
}

// Finds rule based on its name
export function findRule(compUnit: ast, ruleName: string): ruleNode | null {
    let ruleModule: null | string = null;
    let modulePath: null | string = null;
    if (ruleName.includes("'")) {
        ruleName = ruleName.split(".")[1];
        ruleModule = ruleName.split(".")[0];
    }
    if (ruleModule != null) {
        const modules: moduleNode[] = compUnit.modules;
        for (const module of modules) {
            if (module.name === ruleModule) {
                modulePath = module.file;
                break;
            }
        }
    }
    const judgments = compUnit.judgments;
    for (const judgment of judgments) {
        for (const rule of judgment.rules) {
            if (rule.file === modulePath && rule.name === ruleName) {
                return rule;
            }
        }
    }
    return null;
}

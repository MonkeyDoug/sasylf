import { line } from "../types";

export const replaceElement = <T>(arr: T[], index: number, newItem: T) => [
	...arr.slice(0, index),
	newItem,
	...arr.slice(index + 1),
];

export function extractPremise(conclusion: string, tree: line) {
	for (const premise of tree.premises)
		if (premise.conclusion === conclusion) return premise;

	return null;
}

export function getTree(proofNode: Element | undefined): line | null {
	if (!proofNode) return null;

	const containers = proofNode.getElementsByClassName("conclusion");
	const container = containers[containers.length - 1];
	const conclusion = container.getElementsByTagName("span")[0].textContent;
	const name = container.getElementsByTagName("input")[0].value;
	const rules = proofNode.getElementsByClassName("rule");
	const rule = rules[rules.length - 1].textContent;

	let premises: line[] = [];
	const premiseNodes = proofNode.getElementsByClassName("premises");

	for (const premise of premiseNodes) {
		const prev = getTree(premise);

		if (prev) premises.push(prev);
	}

	if (!conclusion || !rule) return null;

	return { conclusion, name, rule, premises };
}

type lineText = {
	conclusion: string;
	name: string;
	rule: string;
	premises: line[];
};

function theoremHelper(root: Element | undefined): lineText[] {
	if (!root) return [];

	const tree = getTree(root);

	if (!tree) return [];

	function bfs(l: line) {
		let res: line[] = [l];

		for (const premise of l.premises) res = res.concat(bfs(premise));

		return res;
	}

	return bfs(tree);
}

export function createTheorem(theoremName: string, dom: HTMLDivElement | null) {
	const root = dom?.getElementsByClassName("root-node")[0];
	const nodes = theoremHelper(root);

	if (!nodes) return;

	const conclusion = nodes[0].conclusion;
	let content = `theorem ${theoremName} : ${conclusion}.\n`;
	for (const node of nodes) {
		content += `${node.name}: ${node.conclusion} by rule ${node.rule.trim()}${
			node.premises.length === 0
				? ""
				: ` on ${node.premises.map((premise) => premise.name).join(", ")}`
		}\n`;
	}
	return content;
}

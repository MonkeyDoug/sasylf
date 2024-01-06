import React, { useState, useEffect, useContext } from "react";
import Droppable from "./droppable";
import CloseButton from "react-bootstrap/CloseButton";
import { DroppedContext } from "./state";
import Form from "react-bootstrap/Form";
import Draggable from "./draggable";
import { line, extractPremise } from "./utils";

let nodeCounter = 1;

function Premises(props: { args: string[]; tree: line | null }) {
	return (
		<div className="d-flex flex-row premises">
			{props.args.slice(0, -1).map((arg, ind) => (
				<ProofNode
					className="premise"
					conclusion={arg}
					root={false}
					key={ind}
					tree={props.tree ? extractPremise(arg, props.tree) : null}
				/>
			))}
		</div>
	);
}

interface nodeProps {
	conclusion: string;
	root: boolean;
	className?: string;
	tree: line | null;
}

function ProofNode(props: nodeProps) {
	const { dropped, removeHandler, addHandler } = useContext(DroppedContext);
	const [id, setId] = useState(0);
	const [args, setArgs] = useState<string[] | null>(null);

	useEffect(() => {
		setId(nodeCounter++);
		nodeCounter++;

		if (props.tree) addHandler(id, props.tree.rule);
	}, []);
	useEffect(() => {
		if (id in dropped)
			(window as any).electronAPI
				.parse(props.conclusion, dropped[id])
				.then((res: string[]) => setArgs(res));
		else setArgs(null);
	}, [dropped]);

	return (
		<div
			className={`d-flex flex-row proof-node m-2 ${
				props.root ? "root-node" : ""
			}`}
		>
			<div className="d-flex flex-column">
				{args ? (
					args.length > 1 ? (
						<Premises args={args} tree={props.tree} />
					) : null
				) : (
					<Droppable
						id={id + 1}
						data={{ ruleLike: false }}
						className="d-flex stretch-container"
					>
						<div className="drop-node-area p-2">Copy node here</div>
					</Droppable>
				)}
				<div className="node-line"></div>
				<div className="d-flex flex-row conclusion">
					<Form.Control
						size="sm"
						className="panning-excluded m-1"
						type="text"
						placeholder="Name"
						htmlSize={5}
					/>
					<Draggable id={id} data={{ ruleLike: false, text: props.conclusion }}>
						<span className="centered-text no-wrap">{props.conclusion}</span>
					</Draggable>
				</div>
			</div>
			<Droppable
				id={id}
				data={{ ruleLike: true }}
				className="d-flex stretch-container"
			>
				<div className="drop-area rule p-2">
					{id in dropped ? (
						<>
							{dropped[id]} <CloseButton onClick={() => removeHandler(id)} />
						</>
					) : (
						"Put rule here"
					)}
				</div>
			</Droppable>
		</div>
	);
}

export default function ProofArea({ proofRef }) {
	return (
		<div className="d-flex proof-area" ref={proofRef}>
			<ProofNode conclusion="(s (z)) + n = (s n)" root tree={null} />
		</div>
	);
}

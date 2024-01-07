import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { Data } from "./utils";

interface draggableProps {
	id: number | string;
	children: any;
	data: Data;
}

export default function Draggable(props: draggableProps) {
	const { attributes, listeners, setNodeRef } = useDraggable({
		id: props.id,
		data: props.data,
	});

	return (
		<div ref={setNodeRef} {...listeners} {...attributes}>
			{props.children}
		</div>
	);
}

import React from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import { input } from "../types";

interface InputProps {
	show: boolean;
	onHide: () => void;
	inputs: input[];
}

export default function Input(props: InputProps) {
	function handleExport(event) {
		event.preventDefault();
		const formData = new FormData(event.target);

		const formJson = Object.fromEntries(formData.entries());
		const input: string = formJson.input as string;
		const free: boolean = formJson.hasOwnProperty("free");
		const inputType: string = formJson.type as string;
		props.inputs.push({ input, free });
		props.onHide();
	}

	return (
		<Modal show={props.show} onHide={props.onHide}>
			<Modal.Header closeButton>
				<Modal.Title>Create New Theorem</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form method="post" onSubmit={handleExport}>
					<Form.Select name="type">
						<option value="conclusion">Conclusion</option>
						<option value="premise">Premise</option>
					</Form.Select>
					<Form.Control
						name="input"
						type="text"
						placeholder="(s (z)) + n = (s n)"
					/>
					<Form.Check
						type="switch"
						name="free"
						label="Allow free variables"
						className="m-1"
					/>
					<Button variant="success" type="submit">
						Create
					</Button>
				</Form>
			</Modal.Body>
		</Modal>
	);
}

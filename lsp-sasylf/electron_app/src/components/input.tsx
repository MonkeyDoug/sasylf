import React from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import DropdownButton from "react-bootstrap/DropdownButton";
import Dropdown from "react-bootstrap/Dropdown";
import Modal from "react-bootstrap/Modal";
import { input } from "../types";

interface InputProps {
	show: boolean;
	onHide: () => void;
	inputs: input[];
	appendHandler: (inp: input) => void;
}

export default function Input(props: InputProps) {
	const handleExport: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);

		const formJson = Object.fromEntries(formData.entries());
		const input: string = formJson.input as string;
		const free: boolean = formJson.hasOwnProperty("free");
		props.appendHandler({
			input,
			free,
			id: Math.max(-1, ...props.inputs.map((element) => element.id)) + 1,
		});
		const inputType: string = formJson.type as string;
		props.onHide();
	};

	return (
		<Modal show={props.show} onHide={props.onHide}>
			<Modal.Header closeButton>
				<Modal.Title>Create New Theorem</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form method="post" onSubmit={handleExport}>
					<InputGroup className="mb-3">
						<DropdownButton variant="outline-secondary" title="Dropdown">
							<Dropdown.Item href="#">Conclusion</Dropdown.Item>
							<Dropdown.Item href="#">Premises</Dropdown.Item>
						</DropdownButton>
						<Form.Control />
					</InputGroup>
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

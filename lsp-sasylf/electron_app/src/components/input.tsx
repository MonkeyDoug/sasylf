import React from "react";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { input } from "../types";

interface InputProps {
	show: boolean;
	onHide: () => void;
	inputs: input[];
	appendHandler: (inp: input) => void;
}

export default function Input(props: InputProps) {
	const [selectedType, setSelectedType] = React.useState<string>("Premises");
	const [numInputs, setNumInputs] = React.useState<number>(1);

	const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSelectedType(event.target.value);
	};

	const handleExport: React.FormEventHandler<HTMLFormElement> = (event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);

		const formJson = Object.fromEntries(formData.entries());
		const free: boolean = formJson.hasOwnProperty("free");
		const type: string = formJson.type as string;
		let input: string[] = Array(numInputs).fill("");
		if (type === "Conclusion") {
			input[0] = formJson.input as string;
		}
		if (type === "Premises") {
			for (const [key, value] of formData.entries()) {
				let index = 0;
				if (key.includes("input")) {
					index = parseInt(key.replace("input-", ""), 10);
					input[index] = value as string;
				}
			}
		}
		props.appendHandler({
			input,
			free,
			id: Math.max(-1, ...props.inputs.map((element) => element.id)) + 1,
			type,
		});
		console.log(formJson);
		props.onHide();
	};

	return (
		<Modal show={props.show} onHide={props.onHide}>
			<Modal.Header closeButton>
				<Modal.Title>Create New Theorem</Modal.Title>
			</Modal.Header>
			<Modal.Body>
				<Form method="post" onSubmit={handleExport}>
					<Form.Check
						type="radio"
						label="Premises"
						name="type"
						value="Premises"
						checked={selectedType === "Premises"}
						onChange={handleTypeChange}
					/>
					<Form.Check
						type="radio"
						label="Conclusion"
						name="type"
						value="Conclusion"
						checked={selectedType === "Conclusion"}
						onChange={handleTypeChange}
					/>

					{selectedType === "Premises" && (
						/* Render Premises-specific form elements */
						<>
							{Array.from(Array(numInputs).keys()).map((i, ind) => (
								<Form.Control
									name={`input-${i}`}
									type="text"
									placeholder="Enter premise"
									className="m-1"
									key={ind}
								/>
							))}
							<Button
								variant="success"
								className="m-1"
								onClick={() => setNumInputs(numInputs + 1)}
							>
								Add Premise
							</Button>
						</>
					)}

					{selectedType === "Conclusion" && (
						/* Render Conclusion-specific form elements */
						<Form.Control
							name="input"
							type="text"
							placeholder="Enter conclusion"
						/>
					)}

					<Form.Check
						type="switch"
						name="free"
						label="Allow free variables"
						className="m-1"
					/>
					<Button variant="success" type="submit" size="lg">
						Create
					</Button>
				</Form>
			</Modal.Body>
		</Modal>
	);
}

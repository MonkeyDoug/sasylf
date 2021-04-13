package org.sasylf.refactor;

import java.util.function.Consumer;

import org.eclipse.core.resources.IFile;
import org.eclipse.jface.text.IDocument;
import org.sasylf.IDEProof;
import org.sasylf.editors.ProofEditor;

import edu.cmu.cs.sasylf.ast.CompUnit;
import edu.cmu.cs.sasylf.ast.Named;
import edu.cmu.cs.sasylf.ast.QualName;

public class RefactoringContext {
	private String oldName;
	private ProofEditor proofEditor;
	private IDEProof proof;
	private IFile proofFile;
	private CompUnit compUnit;
	private IDocument proofDoc;
	private Named declaration;
	
	public void setOldName(String name) {
		oldName = name;
	}
	
	public String getOldName() {
		return oldName;
	}
	
	public IFile getProofFile() {
		return proofFile;
	}
	
	public IDocument getProofDocument() {
		return proofDoc;
	}
	
	public CompUnit getCompUnit() {
		return compUnit;
	}
	
	public void setProofEditor(ProofEditor editor) {
		this.proofEditor = editor;
		proof = IDEProof.getProof(proofEditor.getEditorInput());
		proofFile = proofEditor.getEditorInput().getAdapter(IFile.class);
		proofDoc = proofEditor.getDocument();
		compUnit = IDEProof.getCompUnit(proofFile);
		declaration = proof.findDeclarationByName(oldName);
	}
	
	public ProofEditor getProofEditor() {
		return proofEditor;
	}
	
	public boolean areAllValuesSet() {
		return oldName != null && proofFile != null && compUnit != null && 
				proof != null && proofEditor != null && proofDoc != null &&
				declaration != null;
	}
	
	public boolean containsTheorem(String name) {
		
		return false;
	}
	
	public void collectQualNames(Consumer<QualName> consumer) {
		compUnit.collectQualNames(consumer);
	}
}

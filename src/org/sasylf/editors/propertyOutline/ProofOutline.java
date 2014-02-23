package org.sasylf.editors.propertyOutline;


import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Stack;
import java.util.TreeSet;

import org.eclipse.core.resources.IFile;
import org.eclipse.core.resources.IResource;
import org.eclipse.jface.text.BadLocationException;
import org.eclipse.jface.text.BadPositionCategoryException;
import org.eclipse.jface.text.DefaultPositionUpdater;
import org.eclipse.jface.text.IDocument;
import org.eclipse.jface.text.IPositionUpdater;
import org.eclipse.jface.text.Position;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.viewers.ITreeContentProvider;
import org.eclipse.jface.viewers.LabelProvider;
import org.eclipse.jface.viewers.SelectionChangedEvent;
import org.eclipse.jface.viewers.TreeViewer;
import org.eclipse.jface.viewers.Viewer;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Display;
import org.eclipse.ui.IEditorInput;
import org.eclipse.ui.IFileEditorInput;
import org.eclipse.ui.texteditor.IDocumentProvider;
import org.eclipse.ui.texteditor.ITextEditor;
import org.eclipse.ui.views.contentoutline.ContentOutlinePage;
import org.sasylf.ProofChecker;
import org.sasylf.project.ProofBuilder;
import org.sasylf.util.DocumentUtil;

import edu.cmu.cs.sasylf.ast.Case;
import edu.cmu.cs.sasylf.ast.Clause;
import edu.cmu.cs.sasylf.ast.CompUnit;
import edu.cmu.cs.sasylf.ast.Derivation;
import edu.cmu.cs.sasylf.ast.DerivationByAnalysis;
import edu.cmu.cs.sasylf.ast.Fact;
import edu.cmu.cs.sasylf.ast.Judgment;
import edu.cmu.cs.sasylf.ast.Location;
import edu.cmu.cs.sasylf.ast.Rule;
import edu.cmu.cs.sasylf.ast.RuleCase;
import edu.cmu.cs.sasylf.ast.Theorem;

/**
 * A content outline page which summarizes the structure of a proof file.
 */
public class ProofOutline extends ContentOutlinePage implements ProofChecker.Listener {

//	private Object rootElement;
	/**
	 * Divides the editor's document into ten segments and provides elements for them.
	 */
	protected class ContentProvider implements ITreeContentProvider {

		protected final static String SEGMENTS= "__slf_segments"; //$NON-NLS-1$
		protected IPositionUpdater fPositionUpdater= new DefaultPositionUpdater(SEGMENTS);
		protected Collection<ProofElement> pList= new TreeSet<ProofElement>();
		
		private boolean inResource(Location loc, IResource res) {
		  String name = loc.getFile();
		  if (res.getName().equals(name)) return true;
		  System.out.println("Are modules implemented? " + res.getName() + " != " + name);
		  return true;
		}
		
		private Position convertLocToPos(IDocument document, Location loc) {
			Position pos = null;
			try {
				int lineOffset = document.getLineOffset(loc.getLine() - 1);
				int lineLength = document.getLineLength(loc.getLine() - 1);
				pos = new Position(lineOffset, lineLength);
				document.addPosition(pos);
			} catch (BadLocationException e) {
				e.printStackTrace();
			}
			return pos;
		}
		
		public void newCompUnit(IFile documentFile, IDocument document, CompUnit cu) {
		  pList.clear();
			
			if(cu == null) {
				return;
			}
			
			ProofElement pe = null;
			
			//terminals
//			for (Terminal t : cu.getTerminals()) {
//				if (Character.isJavaIdentifierStart(t.getSymbol().charAt(0))) {
//					pe = new PropertyElement("terminal", t.getGrmSymbol().toString());
//					pe.setPosition(convertLocToPos(document, t.getLocation()));
//					pList.add(pe);
//				}
//			}
//			
			//judgments
			for (Judgment judg : cu.getJudgments()) {
			  if (!inResource(judg.getLocation(), documentFile)) continue;
				pe = new ProofElement("Judgment", (judg.getName() + ": " + judg.getForm()).replaceAll("\"", ""));
				pe.setPosition(convertLocToPos(document, judg.getLocation()));
				pList.add(pe);
				for (Rule r : judg.getRules()) {
				  StringBuilder sb = new StringBuilder();
				  sb.append(r.getName()).append(": ");
				  for (Clause cl : r.getPremises()) {
				    sb.append("forall " + cl).append(" ");
				  }
				  sb.append("exists ");
				  sb.append(r.getConclusion());
				  ProofElement re = new ProofElement("Rule", sb.toString().replaceAll("\"", ""));
				  Location loc = r.getLocation();
				  if (r.getPremises().size() > 0) {
				    loc = r.getPremises().get(0).getLocation();
				  }
				  re.setPosition(convertLocToPos(document, loc));
				  pe.addChild(re);
				}
			}
			
			//theorem
			for (Theorem theo : cu.getTheorems()) {
        if (!inResource(theo.getLocation(), documentFile)) continue;
				StringBuilder sb = new StringBuilder();
				sb.append(theo.getName());
				sb.append(": ");
				for(Fact fact : theo.getForalls()) {
	        sb.append("forall ");
					sb.append(fact.getElement()).append(" ");
				}
				sb.append("exists ");
				sb.append(theo.getExists());
				/*for(Element element : theo.getExists().getElements()) {
					sb.append(element).append(" ");
				}*/
				pe = new ProofElement(theo.getKindTitle(), sb.toString().replaceAll("\"", ""));
				try {
          pe.setPosition(DocumentUtil.getNodePosition(theo, document));
        } catch (BadLocationException e) {
          e.printStackTrace();
        }
				pList.add(pe);
				/* This part  hasn't ever been useful, and it uses up screen real estate:
				cStack.push(pe);
				for(Derivation deri: theo.getDerivations()) {
					if(deri instanceof DerivationByAnalysis) {
						findCaseRule(document, ((DerivationByAnalysis) deri).getCases());
					}
				}
				cStack.pop();*/
			}
		}
		
		Stack<ProofElement> cStack = new Stack<ProofElement>();

		@SuppressWarnings("unused")  // considering removing this capability
    private void findCaseRule(IDocument document, List<Case> rList) {
			for(Case _case : rList) {
				if(_case instanceof RuleCase) {
					RuleCase ruleCase = (RuleCase) _case;
					ProofElement pe = new ProofElement("Case rule", ruleCase.getRuleName());
					pe.setPosition(convertLocToPos(document, ruleCase.getLocation()));
					if(!cStack.empty()) {
						cStack.peek().addChild(pe);
						pe.setParentElement(cStack.peek());
					}
					cStack.push(pe);
					for(Derivation deri : ruleCase.getDerivations()) {
						if(deri instanceof DerivationByAnalysis) {
							findCaseRule(document, ((DerivationByAnalysis) deri).getCases());
						}
					}
					if(!cStack.empty()) {
						cStack.pop();
					}
				}
			}
		}
		
		/*
		 * @see IContentProvider#inputChanged(Viewer, Object, Object)
		 */
		public void inputChanged(Viewer viewer, Object oldInput, Object newInput) {
		  System.out.println("oldInput = " + oldInput + ", newInput = " + newInput);
			if (oldInput != null) {
				IDocument document= fDocumentProvider.getDocument(oldInput);
				if (document != null) {
					try {
						document.removePositionCategory(SEGMENTS);
					} catch (BadPositionCategoryException x) {
					}
					document.removePositionUpdater(fPositionUpdater);
				}
			}

			pList.clear();

			if (newInput != null) {
				IDocument document= fDocumentProvider.getDocument(newInput);
				if (document != null) {
					document.addPositionCategory(SEGMENTS);
					document.addPositionUpdater(fPositionUpdater);
					
					if(newInput instanceof IFileEditorInput) {
						//String filePath = ((IFileEditorInput) newInput).getFile().getLocationURI().getPath().replaceFirst("/", "");
						IFile file = ((IFileEditorInput)newInput).getFile(); // new File(filePath);
						newCompUnit(file, document, ProofBuilder.getCompUnit(file));
					}
				}
			}
		}

		/*
		 * @see IContentProvider#dispose
		 */
		public void dispose() {
			if (pList != null) {
				pList.clear();
				pList= null;
			}
		}

		/*
		 * @see IContentProvider#isDeleted(Object)
		 */
		public boolean isDeleted(Object element) {
			return false;
		}

		/*
		 * @see IStructuredContentProvider#getElements(Object)
		 */
		public Object[] getElements(Object element) {
			return pList.toArray();
		}

		/*
		 * @see ITreeContentProvider#hasChildren(Object)
		 */
		public boolean hasChildren(Object element) {
			return ((ProofElement)element).hasChildren();
		}

		/*
		 * @see ITreeContentProvider#getParent(Object)
		 */
		public Object getParent(Object element) {
			if (element instanceof ProofElement)
				return ((ProofElement)element).getParentElement();
			return null;
		}

		/*
		 * @see ITreeContentProvider#getChildren(Object)
		 */
		public Object[] getChildren(Object element) {
			if (element instanceof ProofElement) {
				List<ProofElement> children = ((ProofElement)element).getChildren();
				if (children == null) return null;
        return children.toArray();
			}
			return null;
		}
		
		public ProofElement findProofElementByName(String name) {
		  String key = name + ": ";
		  for (ProofElement pe : pList) {
		    if (pe.getContent().startsWith(key)) return pe;
		    if ("Judgment".equals(pe.getCategory())) {
		      if (pe.getChildren() == null) continue;
		      for (ProofElement ce : pe.getChildren()) {
		        if (ce.getContent().startsWith(key)) return ce;
		      }
		    }
		  }
		  return null;
		}
		
		public List<ProofElement> findMatching(String category, String prefix) {
		  if (category == null) category = "";
		  // System.out.println("category = " + category + ", prefix = " + prefix);
		  List<ProofElement> result = new ArrayList<ProofElement>();
		  for (ProofElement pe : pList) {
		    // System.out.println("  looking at " + pe);
        if (categoryMatch(pe.getCategory(),category) && pe.getContent().startsWith(prefix)) result.add(pe);
        if ("Judgment".equals(pe.getCategory())) {
          if (pe.getChildren() == null) continue;
          for (ProofElement ce : pe.getChildren()) {
            if (ce.getCategory().startsWith(category) &&
                ce.getContent().startsWith(prefix)) result.add(ce);
          }
        }
      }
		  return result;
		}
		
		protected boolean categoryMatch(String cat, String pattern) {
		  if (pattern.length() == 0) return true;
		  if (cat.equals(pattern)) return true;
		  if (cat.equals("Lemma") && pattern.equals("Theorem") ||
		      cat.equals("Theorem") && pattern.equals("Lemma")) return true;
		  return false;
		}
	}

	protected IEditorInput fInput;
	protected IDocumentProvider fDocumentProvider;
	protected ITextEditor fTextEditor;

	/**
	 * Creates a content outline page using the given provider and the given editor.
	 * XXX: do it at every check, not just at save.
	 * XXX: but perhaps this must wait for a builder....
	 * @param provider the document provider
	 * @param editor the editor
	 */
	public ProofOutline(IDocumentProvider provider, ITextEditor editor) {
		super();
		this.fDocumentProvider = provider;
		this.fTextEditor = editor;
		ProofChecker.getInstance().addListener(this);
	}

	/* (non-Javadoc)
	 * Method declared on ContentOutlinePage
	 */
	public void createControl(Composite parent) {

		super.createControl(parent);

		TreeViewer viewer= getTreeViewer();
		viewer.setContentProvider(new ContentProvider());
		viewer.setLabelProvider(new LabelProvider());
		viewer.addSelectionChangedListener(this);

		if (fInput != null)
			viewer.setInput(fInput);
	}
	
	/* (non-Javadoc)
	 * Method declared on ContentOutlinePage
	 */
	public void selectionChanged(SelectionChangedEvent event) {

		super.selectionChanged(event);

		ISelection selection= event.getSelection();
		if (selection.isEmpty())
			fTextEditor.resetHighlightRange();
		else {
			ProofElement element = (ProofElement) ((IStructuredSelection) selection).getFirstElement();
			int start= element.getPosition().getOffset();
			int length= element.getPosition().getLength();
			try {
				fTextEditor.setHighlightRange(start, length, true);
			} catch (IllegalArgumentException x) {
				fTextEditor.resetHighlightRange();
			}
		}
	}
	
	/**
	 * Sets the input of the outline page
	 * 
	 * @param input the input of this outline page
	 */
	public void setInput(IEditorInput input) {
		fInput= input;
		IFile f = (IFile)fInput.getAdapter(IFile.class);
		proofChecked(f,ProofBuilder.getCompUnit(f));
	}
	
	
	@Override
  public void proofChecked(final IFile file, final CompUnit cu) {
	  if (file == null || cu == null || fInput == null) return;
	  if (!file.equals(fInput.getAdapter(IFile.class))) return;
	  final TreeViewer viewer= getTreeViewer();
	  if (viewer != null) {
	    Display.getDefault().asyncExec(new Runnable() {
	      public void run() {
	        Control control= viewer.getControl();
	        if (control != null && !control.isDisposed()) {
	          control.setRedraw(false);
	          ContentProvider provider = (ContentProvider)viewer.getContentProvider();
	          IDocument doc = fDocumentProvider.getDocument(fInput);
	          provider.newCompUnit(file,doc,cu);
	          viewer.expandAll();
	          control.setRedraw(true);
	          viewer.refresh(); // doesn't work if inside the controlled area.
	        }
	      }
	    });
	  }
	}


	@Override
	public void dispose() {
	  fInput = null;
	  ProofChecker.getInstance().removeListener(this);
	}
	
  /**
	 * Updates the outline page.
	 */
	public void update() {
	}
	
	/**
	 * Find a theorem or judgment by name.
	 * @param name name of theorem of judgment to locate
	 * @return position of declaration, or null if not found.
	 */
	public ProofElement findProofElementByName(String name) {
	  ContentProvider provider = (ContentProvider)getTreeViewer().getContentProvider();
	  return provider.findProofElementByName(name);
	}
	
	/**
	 * Return a list of content strings that start with the given key (for content assist)
	 */
	public List<String> findContentAssist(String category, String prefix) {
    List<String> result = new ArrayList<String>();
    if (getTreeViewer() == null) {
      System.out.println("No tree viewer!");
      return result;
    }
    ContentProvider provider = (ContentProvider)getTreeViewer().getContentProvider();
	  if (category.equals("lemma")) category = "Lemma";
	  else if (category.equals("theorem")) category = "Theorem";
	  else if (category.equals("rule")) category = "Rule";
	  else category = "";
	  for (ProofElement pe : provider.findMatching(category, prefix)) {
	    result.add(pe.getContent());
	  }
	  return result;
	}
}

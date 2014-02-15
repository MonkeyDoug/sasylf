/**
 * 
 */
package org.sasylf.handlers;

import org.eclipse.core.commands.AbstractHandler;
import org.eclipse.core.commands.ExecutionEvent;
import org.eclipse.core.commands.ExecutionException;
import org.eclipse.jface.viewers.ISelection;
import org.eclipse.jface.viewers.IStructuredSelection;
import org.eclipse.jface.wizard.WizardDialog;
import org.eclipse.swt.widgets.Shell;
import org.eclipse.ui.handlers.HandlerUtil;
import org.sasylf.wizards.NewProjectWizard;

/**
 * A handler to deploy the wizard.
 * @author boyland
 */
public class NewProofProjectHandler extends AbstractHandler {

  /**
   * Create the handler that handles wizards
   */
  public NewProofProjectHandler() { }

  @Override
  public Object execute(ExecutionEvent event) throws ExecutionException {
    Shell shell = HandlerUtil.getActiveShell(event);
    NewProjectWizard wizard = new NewProjectWizard();
    ISelection currentSelection = HandlerUtil.getCurrentSelection(event);
    IStructuredSelection structuredSelection = null;
    if (currentSelection instanceof IStructuredSelection) {
      structuredSelection = (IStructuredSelection)currentSelection;
    }
    wizard.init(HandlerUtil.getActiveWorkbenchWindow(event).getWorkbench(), structuredSelection);
    WizardDialog dialog = new WizardDialog(shell,wizard);
    dialog.open();
    return null;
  }
}

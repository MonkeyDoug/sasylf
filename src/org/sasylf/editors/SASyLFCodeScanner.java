package org.sasylf.editors;

import java.util.ArrayList;
import java.util.List;

import org.eclipse.jface.text.TextAttribute;
import org.eclipse.jface.text.rules.EndOfLineRule;
import org.eclipse.jface.text.rules.ICharacterScanner;
import org.eclipse.jface.text.rules.IRule;
import org.eclipse.jface.text.rules.IToken;
import org.eclipse.jface.text.rules.IWhitespaceDetector;
import org.eclipse.jface.text.rules.IWordDetector;
import org.eclipse.jface.text.rules.MultiLineRule;
import org.eclipse.jface.text.rules.RuleBasedScanner;
import org.eclipse.jface.text.rules.Token;
import org.eclipse.jface.text.rules.WhitespaceRule;
import org.eclipse.jface.text.rules.WordRule;
import org.eclipse.jface.util.Assert;
import org.eclipse.swt.SWT;

public class SASyLFCodeScanner extends RuleBasedScanner{

	private static String[] _keywords = {
		"package", "terminals", "syntax", "judgment",
		"theorem", "forall", "exists", "by", "rule", "on",
		"end", "induction", "analysis", "case", "of",
		"is", "unproved", "lemma", "assumes", "inversion",
		"hypothesis", "substitution", "premise",
		"weakening", "exchange", "contraction", "solve", 
		"proof", "and", "use", "contradiction",
		"module", "extends", "provides", "requires", "or", "not", "do",
		"abstract", "where"
	};

	private static String[] _templates = {
		"NAME", "JUDGMENT", "JUSTIFICATION", "PREMISE",
		"RULENAME", "CONCLUSION", "SYNTAX", "DERIVATION"
	};

	/*private static String[] _types = {

	};

	private static String[] _constants = {

	};*/

	public SASyLFCodeScanner(SASyLFColorProvider provider)	{
		TextAttribute kwAtt = new TextAttribute (provider.getColor(SASyLFColorProvider.KEYWORD), null,SWT.BOLD);
		Token keyword = new Token (kwAtt);

		IToken comment = new Token (new TextAttribute (provider.getColor(SASyLFColorProvider.SINGLE_LINE_COMMENT)));
		IToken other = new Token (new TextAttribute (provider.getColor(SASyLFColorProvider.DEFAULT)));
		IToken multiLineComment = new Token (new TextAttribute (provider.getColor(SASyLFColorProvider.MULTI_LINE_COMMENT)));
		IToken rule = new Token (new TextAttribute (provider.getColor(SASyLFColorProvider.RULE)));

		List<IRule> rules = new ArrayList<IRule> ();
		rules.add (new EndOfLineRule ("//", comment));
		rules.add (new MultiLineRule ("/*", "*/", multiLineComment));
		/*rules.add (new SingleLineRule ("N","E",comment));
		rules.add (new SingleLineRule ("J","T",comment));
		rules.add (new SingleLineRule ("R","E",comment));
		rules.add (new SingleLineRule ("C","N",comment));
		rules.add (new SingleLineRule ("D","N",comment));
		rules.add (new SingleLineRule ("P","E",comment));*/
		//rules.add (new EndOfLineRule ("---", rule));
		rules.add (new LineRule ('-', rule));
		rules.add (new LineRule ('\u2014', rule));
		rules.add (new LineRule ('\u2015', rule));
		rules.add (new LineRule ('\u2500', rule));

		rules.add (new WhitespaceRule (new IWhitespaceDetector() {
			@Override
			public boolean isWhitespace(char ch){
				return Character.isWhitespace(ch);
			}
		}));

		WordRule wordRule = new WordRule (new SASyLFWordDetector(), other) {
			private StringBuffer _buffer = new StringBuffer ();

			@Override
			public IToken evaluate (ICharacterScanner scanner) {
				int c = scanner.read ();
				if (fDetector.isWordStart((char) c)) {
					if(fColumn==UNDEFINED || (fColumn == scanner.getColumn() - 1)) {
						_buffer.setLength(0);
						do {
							_buffer.append((char) c);
							c = scanner.read();
						}
						while (c != ICharacterScanner.EOF && fDetector.isWordPart((char) c));
						scanner.unread();

						IToken token = (IToken) fWords.get(_buffer.toString()/*.toLowerCase()*/);
						if(token != null) {
							return token;
						}

						if (fDefaultToken.isUndefined())
							unreadBuffer (scanner);
						return fDefaultToken;
					}
				}

				scanner.unread();
				return Token.UNDEFINED;
			}

			@Override
			protected void unreadBuffer (ICharacterScanner scanner) {
				for (int i = _buffer.length()-1; i>=0; i--){
					scanner.unread();
				}
			}

		};

		for (int i=0; i<_keywords.length; i++) {
			wordRule.addWord (_keywords [i], keyword);
		}

		for (int j=0; j<_templates.length; j++){
			wordRule.addWord(_templates[j], comment);
		}

		rules.add(wordRule);
		IRule[] result = new IRule[rules.size()];
		rules.toArray(result);
		setRules(result);

	}

	private class SASyLFWordDetector implements IWordDetector {
		@Override
		public boolean isWordPart (char ch) {
			return Character.isLetter(ch) ||
					ch == '_' || ch == '-' ||
					Character.isDigit(ch);
		}

		@Override
		public boolean isWordStart (char ch) {
			return Character.isLetter(ch) ||
					ch == '_';
		}
	}
	
	public static class LineRule implements IRule {
		protected IToken token;
		private char comp;
		
		public LineRule(char barChar, IToken token) {
			comp = barChar;
			this.token = token;
		}
		
		@Override
		public IToken evaluate(ICharacterScanner scanner) {
			// TODO Auto-generated method stub
			int c = scanner.read();
			if (c != comp) {
				scanner.unread();
				return Token.UNDEFINED;
			}
			c = scanner.read();
			if (c != comp) {
				scanner.unread();
				scanner.unread();
				return Token.UNDEFINED;
			}
			c = scanner.read();
			if (c != comp) {
				scanner.unread();
				scanner.unread();
				scanner.unread();
				return Token.UNDEFINED;
			}
		
			while (c == comp)
				c = scanner.read();
			
			while (Character.isWhitespace(c))
				c = scanner.read();
			
			while (Character.isLetterOrDigit(c) || c == '-')
				c = scanner.read();

			scanner.unread();
			return token;
		}
	}

}
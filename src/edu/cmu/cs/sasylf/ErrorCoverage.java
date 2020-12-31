package edu.cmu.cs.sasylf;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.BitSet;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import edu.cmu.cs.sasylf.ast.CompUnit;
import edu.cmu.cs.sasylf.module.ModuleFinder;
import edu.cmu.cs.sasylf.module.PathModuleFinder;
import edu.cmu.cs.sasylf.parser.DSLToolkitParser;
import edu.cmu.cs.sasylf.util.ErrorHandler;
import edu.cmu.cs.sasylf.util.ErrorReport;
import edu.cmu.cs.sasylf.util.Errors;
import edu.cmu.cs.sasylf.util.Location;
import edu.cmu.cs.sasylf.util.Report;
import edu.cmu.cs.sasylf.util.SASyLFError;
import edu.cmu.cs.sasylf.util.Util;

public class ErrorCoverage {

	public static void main(String[] args) {
		ModuleFinder mf = new PathModuleFinder("");
		Util.SHOW_TASK_COMMENTS = false;
		Util.COMP_WHERE = true;
		Util.EXTRA_ERROR_INFO = false;
		Util.VERBOSE = false;
		Util.PRINT_ERRORS = false;
		Util.PRINT_SOLVE = false;
		
		boolean showSource = false; // option
		Set<Errors> interestingErrors = new HashSet<>();
		// hese should not be happening
		interestingErrors.add(Errors.INTERNAL_ERROR);
		interestingErrors.add(Errors.UNSPECIFIED);
		// command line can set other interesting errors
	
		BitSet markedLines = new BitSet();
		DSLToolkitParser.addListener((t,f) -> { if (t.image.startsWith("//!")) markedLines.set(t.beginLine); } ); 
		
		Map<Errors,List<String>> index = new HashMap<>();
		Set<Errors> encountered = index.keySet();
		for (String s : args) {
			if (s.startsWith("--")) {
				if (s.equals("--showSource")) showSource = true;
				else usage();
				continue;
			} else if (!s.endsWith(".slf")) {
				try {
					Errors e = Errors.valueOf(s);
					interestingErrors.add(e);
				} catch (IllegalArgumentException ex) {
					usage();
				}
				continue;
			}
			File f = new File(s);
			CompUnit cu = null;
			try (Reader r = new FileReader(f)) {
				cu = Main.parseAndCheck(mf, s, null, r);
			} catch (FileNotFoundException e) {
				System.err.println("Unable to open '" + s + "': " + e.getLocalizedMessage());
			} catch (IOException e) {
				System.err.println("Error reading '" + s + "': " + e.getLocalizedMessage());
			} catch (SASyLFError e) {
				// already handled
			} catch (RuntimeException e) {
				System.out.println("While checking " + s);
				e.printStackTrace();
			}
			Collection<Report> reports = ErrorHandler.getReports();
			int parseReports = (cu == null) ? reports.size() : cu.getParseReports();
			BitSet errorLines = new BitSet();
			String shortName = f.getName();
			boolean printedName = false;
			int reportIndex = 0;
			// System.out.println("Reports " + parseReports + " " + shortName);
			for (Report r : reports) {
				++reportIndex;
				int line = r.getSpan().getLocation().getLine();
				if (r instanceof ErrorReport) {
					errorLines.set(line);
					ErrorReport er = (ErrorReport)r;
					final Errors type = er.getErrorType();
					if ((type.ordinal() <= Errors.PARSE_ERROR.ordinal()) != 
							(reportIndex <= parseReports)) {
						if (reportIndex <= parseReports) {
							System.err.println("Non parse-type error generated during parsing: " + r);
						} else {
							System.err.println("Parse-type error generated after parsing: " + r);
						}
					}
					if (interestingErrors.contains(type) || 
							(type != Errors.WHERE_MISSING && type != Errors.DERIVATION_UNPROVED &&
								!markedLines.get(line))) {
						if (showSource) {
							if (!printedName) {
								System.out.println("In " + s);
								printedName = true;
							}
							Location loc = r.getSpan().getLocation();
							System.out.format("%6d: %s\n", loc.getLine(),getLine(f,loc.getLine()));
							int col = loc.getColumn()+8-1; // 6 digits plus colon plus space, minus caret
							for (int i=0; i < col; ++i) {
								System.out.print("-");
							}
							System.out.println("^- " + er.getMessage());
						} else {
							System.err.println(r.formatMessage());
							if (er.getExtraInformation() != null) {
								System.err.println("  " + er.getExtraInformation());
							}
						}
					}
					List<String> located = index.get(type);
					if (located == null) {
						located = new ArrayList<>();
						index.put(type, located);
					}
					located.add(shortName);
				}
				r.getMessage();
			}
			markedLines.andNot(errorLines);
			// marked and not error -> missing errors
			for (int i = markedLines.nextSetBit(0); i >= 0; i = markedLines.nextSetBit(i+1)) {
			     System.out.println("Missing expected report for " + s + ":" + i);
			}
			markedLines.clear();
		}
		for (Errors error : Errors.values()) {
			System.out.print(error);
			List<String> located = index.get(error);
			if (located == null || located.isEmpty()) {
				System.out.println(" [no examples]");
			} else {
				int i = 0;
				for (String s : located) {
					if (++i > 5) {
						System.out.print(" ...");
						break;
					}
					System.out.print(" " + s);
				}
				System.out.println();
			}
		}
		System.out.println("Error types generated: " + encountered.size());
		System.out.println("Error types never generated: " + (Errors.values().length - encountered.size()));
	}
	
	private static void usage() {
		System.out.println("usage: java " + ErrorCoverage.class.getName() + " [--showSource] ERRORNAME... filename.slf...");
		System.exit(1);
	}
	
	private static String getLine(File f, int line) {
		// inefficient, but maybe not an issue
		try (BufferedReader r = new BufferedReader(new FileReader(f))) {
			while (line > 1) {
				r.readLine();
				--line;
			}
			return r.readLine();
		} catch (IOException e) {
			return "[" + f + ":" + line + "]";
		}
	}
}

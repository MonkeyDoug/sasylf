import {
	app,
	BrowserWindow,
	Menu,
	MenuItem,
	dialog,
	ipcMain,
	OpenDialogOptions,
	IpcMainInvokeEvent,
} from "electron";
import { spawnSync } from "child_process";
import { ast } from "./types";
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) app.quit();

const createWindow = (): BrowserWindow => {
	const mainWindow = new BrowserWindow({
		height: 600,
		width: 800,
		webPreferences: {
			preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
		},
	});

	mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
	return mainWindow;
};

function handleUpload(mainWindow: BrowserWindow, filePath: string) {
	const command = spawnSync(
		`java -jar ${__dirname}/../../SASyLF.jar`,
		["--lsp", filePath],
		{ shell: true },
	);

	const output = JSON.parse(command.stdout.toString());
	const compUnit: ast = output["ast"];

	mainWindow.webContents.send("add-ast", { compUnit, filePath });
}

function setupMenu(mainWindow: BrowserWindow) {
	let defaultMenu = Menu.getApplicationMenu();

	if (!defaultMenu) return;

	const dialogConfig: OpenDialogOptions = {
		title: "Select a file",
		buttonLabel: "Upload",
		properties: ["openFile"],
	};

	const selectFile = (_: Electron.MenuItem) =>
		dialog
			.showOpenDialog(dialogConfig)
			.then((result) => handleUpload(mainWindow, result.filePaths[0]));

	const newMenu = new Menu();
	defaultMenu.items.forEach((x) => {
		if (x.role?.toLowerCase() === "filemenu") {
			const newSubmenu = new Menu();

			if (!x.submenu) return;

			x.submenu.items.forEach((y) => newSubmenu.append(y));
			const fileItem = new MenuItem({
				label: "Upload File",
				click: selectFile,
			});
			newSubmenu.append(fileItem);

			newMenu.append(
				new MenuItem({
					type: x.type,
					label: x.label,
					submenu: newSubmenu,
				}),
			);
		} else newMenu.append(x);
	});

	Menu.setApplicationMenu(newMenu);
}

function parse(_: IpcMainInvokeEvent, conclusion: string, rule: string) {
	const command = spawnSync(
		"java",
		[
			"-jar",
			`${__dirname}/../../SASyLF.jar`,
			`--parse="${conclusion}"`,
			`--rule="${rule}"`,
			`${__dirname}/../../../../examples/sum.slf`,
		],
		{ shell: true },
	);

	return JSON.parse(command.stdout.toString()).arguments;
}

const setup = (): void => {
	const mainWindow = createWindow();

	ipcMain.handle("parse", parse);
	setupMenu(mainWindow);

	if (process.argv.length > 2) {
		mainWindow.webContents.on("did-finish-load", () => {
			mainWindow.webContents.send("add-ast", {
				compUnit: JSON.parse(process.argv[2]),
				filePath: null,
			});
		});
	}
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", setup);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

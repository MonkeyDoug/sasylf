import { app, BrowserWindow, Menu, MenuItem, dialog, ipcMain, OpenDialogOptions } from 'electron';
import {spawnSync} from 'child_process';
import { ast } from './types';
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
let compUnit: ast;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup'))
    app.quit();

const createWindow = (): void => {
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
        }
    });

    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

function handleUpload (filepath : string) {
	const command = spawnSync(
			`java -jar ${__dirname}/../../SASyLF.jar`,
			["--lsp", filepath], {shell : true}
	);

	const output = JSON.parse(command.stdout.toString());
	const newCompUnit : ast = output['ast'];

	if (newCompUnit != compUnit) {
		compUnit = newCompUnit;
		BrowserWindow.getAllWindows()[0].reload();
	}

	return;
}

function setupMenu() {
    let defaultMenu = Menu.getApplicationMenu();

    if (!defaultMenu) return;

    const dialogConfig: OpenDialogOptions = {
        title: "Select a file",
        buttonLabel: "Upload",
        properties: ["openFile"],
    };

    const selectFile = (_: Electron.MenuItem) => dialog.showOpenDialog(dialogConfig).then((result) => handleUpload(result.filePaths[0]));

    const newMenu = new Menu();
    defaultMenu.items
        .forEach(x => {
            if (x.role?.toLowerCase() === "filemenu") {
                const newSubmenu = new Menu();

                if (!x.submenu) return;

                x.submenu.items.forEach(y => newSubmenu.append(y));
                const fileItem = new MenuItem({ label: "Upload File", click: selectFile });
                newSubmenu.append(fileItem);

                newMenu.append(
                    new MenuItem({
                        type: x.type,
                        label: x.label,
                        submenu: newSubmenu
                    })
                );
            } else
                newMenu.append(x);
        });

    Menu.setApplicationMenu(newMenu);
}

const setup = (): void => {
    if (process.argv.length > 2)
        compUnit = JSON.parse(process.argv[2]);

    ipcMain.handle('getAST', () => compUnit);

    createWindow();
    setupMenu();
};


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', setup);


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0)
        createWindow();
});

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3000;

let mainWindow;
let serverProcess;
let zoomLevel = 1; // default zoom level

// Path to your local logo file (e.g., logo.png in the same directory)
const iconPath = path.join(__dirname, 'logo.png');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 720,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    icon: iconPath, // Set app icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  const menuTemplate = [
    {
      label: 'Go back',
      accelerator: 'Ctrl+Left',
      click: () => {
        if (mainWindow.webContents.canGoBack()) {
          mainWindow.webContents.goBack();
        }
      }
    },
    {
      label: 'Refresh',
      accelerator: 'Ctrl+R',
      click: () => {
        mainWindow.reload();
      }
    },
    {
      label: 'Tag',
      click: () => {
        const tagWindow = new BrowserWindow({
          width: 800,
          height: 600,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        tagWindow.loadURL(`https://p2ilab.serv00.net/tag.html`);
      }
    },
    {
      label: 'Subject',
      click: () => {
        const subjectWindow = new BrowserWindow({
          width: 800,
          height: 600,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        subjectWindow.loadURL(`https://p2ilab.serv00.net/subject.html`);
      }
    },
    {
      label: 'Body',
      click: () => {
        const bodyWindow = new BrowserWindow({
          width: 800,
          height: 600,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        bodyWindow.loadURL(`https://p2ilab.serv00.net/body.html`);
      }
    },
    {
      label: 'Gmass Test',
      click: () => {
        const attachmentWindow = new BrowserWindow({
          width: 800,
          height: 600,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        attachmentWindow.loadURL(`https://www.gmass.co/inbox`);
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Visit Our Website',
      click: () => {
        const websiteWindow = new BrowserWindow({
          width: 1000,
          height: 700,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        websiteWindow.loadURL('https://spangrove.com');
      }
    },
    {
      label: 'Contact Us',
      click: () => {
        const contactWindow = new BrowserWindow({
          width: 800,
          height: 600,
          resizable: true,
          maximizable: true,
          fullscreenable: true,
          icon: iconPath,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          }
        });
        contactWindow.loadURL('https://t.me/sparksender0007');
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Zoom',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            zoomLevel += 0.5;
            mainWindow.webContents.setZoomLevel(zoomLevel);
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            zoomLevel -= 0.5;
            mainWindow.webContents.setZoomLevel(zoomLevel);
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            zoomLevel = 0;
            mainWindow.webContents.setZoomLevel(zoomLevel);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  serverProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

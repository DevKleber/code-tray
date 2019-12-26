const { resolve, basename } = require('path');
const { app, Menu, Tray, dialog, } = require('electron');

const { spawn } = require('child_process');
const terminal = 'gnome-terminal';

const fixPath = require('fix-path');
const fs = require('fs');

const Store = require('electron-store');
const Sentry = require('@sentry/electron');

fixPath();

// Sentry.init({ dsn: 'https://18c9943a576d41248b195b5678f2724e@sentry.io/1506479' });

const schema = {
  projects: {
    type: 'string',
  },
};

let mainTray = {};

if (app.dock) {
  app.dock.hide();
}

const store = new Store({
  schema
});

function getLocale() {
  const locale = app.getLocale();

  switch (locale) {
    case 'es-419' || 'es':
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/es.json')));
    case 'pt-BR' || 'pt-PT':
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/pt.json')));
    default:
      return JSON.parse(fs.readFileSync(resolve(__dirname, 'locale/en.json')));
  }
}

function render(tray = mainTray) {
  const storedProjects = store.get('projects');
  const projects = storedProjects ? JSON.parse(storedProjects) : [];
  const locale = getLocale();

  const items = projects.map(({ name, path }) => ({
    label: name,
    // icon: resolve(__dirname, 'assets', 'code.png'),
    
    click: () => {
      spawn('code', [path], {
        shell: true
      });
    },
    submenu: [{
        label: locale.open,
        icon: resolve(__dirname, 'assets', 'vscode.png'),
        click: () => {
          spawn('code', [path], {
            shell: true
          });
        },
      },
      {
        label: locale.folder,
        icon: resolve(__dirname, 'assets', 'folder1.png'),
        click: () => {
          const release = spawn('lsb_release', ['-i']);
          release.stdout.on('data', (data) => {
            let distro = data.toString().replace(/\s/g, '').split(":")[1];
            if(distro == 'LinuxMint'){
              spawn('nemo', [path], { shell: true });
            }else{
              spawn('nautilus', [path], { shell: true });
            }            
          });

        },
      },
      {
        label: locale.terminal,
        icon: resolve(__dirname, 'assets', 'terminal.png'),
        click: () => {
          spawn (terminal, { cwd: path });
        },
      },
      
      {
        label: locale.remove,
        icon: resolve(__dirname, 'assets', 'delete.png'),
        click: () => {
          store.set('projects', JSON.stringify(projects.filter(item => item.path !== path)));
          render();
        },
      },
    ],
  }));

  const contextMenu = Menu.buildFromTemplate([{
      label: locale.add,
      icon: resolve(__dirname, 'assets', 'plus.png'),
      click: () => {
        const result = dialog.showOpenDialog({
          properties: ['openDirectory']
        });

        if (!result) return;

        const [path] = result;
        const name = basename(path);

        store.set(
          'projects',
          JSON.stringify([
            ...projects,
            {
              path,
              name,
            },
          ]),
        );

        render();
      },
    },
    {
      type: 'separator',
    },
    ...items,
    {
      type: 'separator',
    },
    {
      type: 'normal',
      label: locale.close,
      role: 'quit',
      enabled: true,
      // icon: resolve(__dirname, 'assets', 'logout.png'),
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', tray.popUpContextMenu);
}

app.on('ready', () => {
  mainTray = new Tray(resolve(__dirname, 'assets', 'iconTemplate.png'));

  render(mainTray);
});
